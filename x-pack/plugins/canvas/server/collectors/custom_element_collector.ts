/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SearchResponse } from 'elasticsearch';
import { get } from 'lodash';
import { MakeSchemaFrom } from 'src/plugins/usage_collection/server';
import { collectFns } from './collector_helpers';
import {
  TelemetryCollector,
  TelemetryCustomElement,
  TelemetryCustomElementDocument,
} from '../../types';
import { parseExpression } from '../../../../../src/plugins/expressions/common';

const CUSTOM_ELEMENT_TYPE = 'canvas-element';
interface CustomElementSearch {
  [CUSTOM_ELEMENT_TYPE]: TelemetryCustomElementDocument;
}

export interface CustomElementTelemetry {
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

export const customElementSchema: MakeSchemaFrom<CustomElementTelemetry> = {
  custom_elements: {
    count: { type: 'long' },
    elements: {
      min: { type: 'long' },
      max: { type: 'long' },
      avg: { type: 'float' },
    },
    functions_in_use: { type: 'array', items: { type: 'keyword' } },
  },
};

function isCustomElement(maybeCustomElement: any): maybeCustomElement is TelemetryCustomElement {
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
  Calculate statistics about a collection of CustomElement Documents
  @param customElements - Array of CustomElement documents
  @returns Statistics about how Custom Elements are being used
*/
export function summarizeCustomElements(
  customElements: TelemetryCustomElementDocument[]
): CustomElementTelemetry {
  const functionSet = new Set<string>();

  const parsedContents: TelemetryCustomElement[] = customElements
    .map((element) => element.content)
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

  parsedContents.map((contents) => {
    contents.selectedNodes.map((node) => {
      const ast = parseExpression(node.expression);
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
  kibanaIndex,
  esClient
) {
  const customElementParams = {
    size: 10000,
    index: kibanaIndex,
    ignoreUnavailable: true,
    filterPath: [`hits.hits._source.${CUSTOM_ELEMENT_TYPE}.content`],
    body: { query: { bool: { filter: { term: { type: CUSTOM_ELEMENT_TYPE } } } } },
  };

  const { body: esResponse } = await esClient.search<SearchResponse<CustomElementSearch>>(
    customElementParams
  );

  if (get(esResponse, 'hits.hits.length') > 0) {
    const customElements = esResponse.hits.hits.map((hit) => hit._source[CUSTOM_ELEMENT_TYPE]);
    return summarizeCustomElements(customElements);
  }

  return {};
};

export { customElementCollector };
