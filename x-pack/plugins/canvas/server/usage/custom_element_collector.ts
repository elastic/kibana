/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SearchParams, SearchResponse } from 'elasticsearch';
import { get } from 'lodash';
// @ts-ignore Library missing definitions
import { fromExpression } from '@kbn/interpreter/common';
import { AST, collectFns } from './collector_helpers';
import { TelemetryCollector } from './collector';

const CUSTOM_ELEMENT_TYPE = 'canvas-element';
interface CustomElementSearch {
  // Making this a string instead of importing from constants because
  // typescript can't recognize the type from a JS file, and switching constants
  // to TS causes eslint problems elsewhere.
  [CUSTOM_ELEMENT_TYPE]: {
    content: string;
  };
}

interface CustomElementTelemetry {
  custom_elements?: {
    count: number;
    elements: {
      min: number;
      max: number;
      avg: number;
    };
    functions_in_use: string[];
  };
}

interface CustomElement {
  selectedNodes: Array<{
    expression: string;
  }>;
}

function isCustomElement(maybeCustomElement: any): maybeCustomElement is CustomElement {
  return (
    maybeCustomElement !== null &&
    Array.isArray(maybeCustomElement.selectedNodes) &&
    maybeCustomElement.selectedNodes.every(
      (node: any) => node.expression && typeof node.expression === 'string'
    )
  );
}

function parseJsonOrNull(maybeJson: string) {
  try {
    return JSON.parse(maybeJson);
  } catch (e) {
    return null;
  }
}

/**
  Transform a CustomElementSearch type into CustomElementTelemetry

  @param response - ES Response for CustomElements
  @returns Statistics about how Custom Elements are being used
*/
export function handleResponse(
  response: SearchResponse<CustomElementSearch>
): CustomElementTelemetry {
  const customElements = response.hits.hits.map(hit => hit._source[CUSTOM_ELEMENT_TYPE].content);
  const functionSet = new Set<string>();

  const parsedContents: CustomElement[] = customElements
    .map(parseJsonOrNull)
    .filter(isCustomElement);

  if (parsedContents.length === 0) {
    return {};
  }

  const elements = {
    min: Infinity,
    max: -Infinity,
    avg: 0,
  };

  let totalElements = 0;

  parsedContents.map(contents => {
    contents.selectedNodes.map(node => {
      const ast: AST = fromExpression(node.expression) as AST;
      collectFns(ast, (cFunction: string) => {
        functionSet.add(cFunction);
      });
    });
    elements.min = Math.min(elements.min, contents.selectedNodes.length);
    elements.max = Math.max(elements.max, contents.selectedNodes.length);
    totalElements += contents.selectedNodes.length;
  });

  elements.avg = totalElements / parsedContents.length;

  return {
    custom_elements: {
      elements,
      count: customElements.length,
      functions_in_use: Array.from(functionSet),
    },
  };
}

const customElementCollector: TelemetryCollector = async function customElementCollector(
  server,
  callCluster
) {
  const index = server.config().get<string>('kibana.index');

  const customElementParams: SearchParams = {
    size: 10000,
    index,
    ignoreUnavailable: true,
    filterPath: [`hits.hits._source.${CUSTOM_ELEMENT_TYPE}.content`],
    body: { query: { bool: { filter: { term: { type: CUSTOM_ELEMENT_TYPE } } } } },
  };

  const esResponse = await callCluster<CustomElementSearch>('search', customElementParams);

  if (get(esResponse, 'hits.hits.length') > 0) {
    return handleResponse(esResponse);
  }

  return {};
};

export { customElementCollector };
