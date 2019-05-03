/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get } from 'lodash';
import { fromExpression } from '@kbn/interpreter/common';
import { CUSTOM_ELEMENT_TYPE } from '../../common/lib/constants';
import { collectFns } from './collector_helpers';

function parseJsonOrNull(str) {
  try {
    return JSON.parse(str);
  } catch (e) {
    return null;
  }
}

export function handleResponse({ hits }) {
  const customElements = get(hits, 'hits', []).map(hit => hit._source[CUSTOM_ELEMENT_TYPE].content);
  const functionSet = new Set();

  const parsedContents = customElements.map(parseJsonOrNull).filter(contents => contents !== null);

  if (parsedContents.length === 0) {
    return {};
  }

  const elements = {
    min: Infinity,
    max: -Infinity,
  };

  let totalElements = 0;

  parsedContents.map(contents => {
    contents.selectedNodes.map(node => {
      const ast = fromExpression(node.expression);
      collectFns(ast, cFunction => {
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

export async function customElementCollector(server, callCluster) {
  const index = server.config().get('kibana.index');
  const customElementParams = {
    size: 10000,
    index,
    ignoreUnavailable: true,
    filterPath: [`hits.hits._source.${CUSTOM_ELEMENT_TYPE}.content`],
    body: { query: { bool: { filter: { term: { type: CUSTOM_ELEMENT_TYPE } } } } },
  };
  const esResponse = await callCluster('search', customElementParams);
  if (get(esResponse, 'hits.hits.length') > 0) {
    return handleResponse(esResponse);
  }

  return {};
}
