/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SearchParams, SearchResponse } from 'elasticsearch';
import { sum as arraySum, min as arrayMin, max as arrayMax, get } from 'lodash';
// @ts-ignore Library missing definitions
import { fromExpression } from '@kbn/interpreter/common';
import { CANVAS_TYPE } from '../../common/lib/constants';
import { AST, collectFns } from './collector_helpers';
import { TelemetryCollector } from './collector';

interface Element {
  expression: string;
}

interface Page {
  elements: Element[];
}

export interface Workpad {
  pages: Page[];
}

interface WorkpadSearch {
  [CANVAS_TYPE]: Workpad;
}

interface WorkpadTelemetry {
  workpads?: {
    total: number;
  };
  pages?: {
    total: number;
    per_workpad: {
      avg: number;
      min: number;
      max: number;
    };
  };
  elements?: {
    total: number;
    per_page: {
      avg: number;
      min: number;
      max: number;
    };
  };
  functions?: {
    total: number;
    in_use: string[];
    per_element: {
      avg: number;
      min: number;
      max: number;
    };
  };
}

/**
  Transform a WorkpadSearch into WorkpadTelemetry
*/
export function handleResponse(response: SearchResponse<WorkpadSearch>): WorkpadTelemetry {
  const workpadDocs = response.hits.hits;
  if (workpadDocs == null) {
    return {};
  }

  const functionSet = new Set();

  // make a summary of info about each workpad
  const workpadsInfo = workpadDocs.map(hit => {
    const workpad = hit._source[CANVAS_TYPE];

    let pages = { count: 0 };
    try {
      pages = { count: workpad.pages.length };
    } catch (err) {
      // eslint-disable-next-line
      console.warn(err, workpad);
    }
    const elementCounts = workpad.pages.reduce(
      (accum, page) => accum.concat(page.elements.length),
      [] as number[]
    );
    const functionCounts = workpad.pages.reduce(
      (accum, page) => {
        return page.elements.map(element => {
          const ast = fromExpression(element.expression) as AST;
          collectFns(ast, cFunction => {
            functionSet.add(cFunction);
          });
          return ast.chain.length; // get the number of parts in the expression
        });
      },
      [] as number[]
    );

    return { pages, elementCounts, functionCounts };
  });

  // combine together info from across the workpads
  const combinedWorkpadsInfo = workpadsInfo.reduce(
    (accum, pageInfo) => {
      const { pages, elementCounts, functionCounts } = pageInfo;

      return {
        pageMin: pages.count < accum.pageMin ? pages.count : accum.pageMin,
        pageMax: pages.count > accum.pageMax ? pages.count : accum.pageMax,
        pageCounts: accum.pageCounts.concat(pages.count),
        elementCounts: accum.elementCounts.concat(elementCounts),
        functionCounts: accum.functionCounts.concat(functionCounts),
      };
    },
    {
      pageMin: Infinity,
      pageMax: -Infinity,
      pageCounts: [] as number[],
      elementCounts: [] as number[],
      functionCounts: [] as number[],
    }
  );
  const { pageCounts, pageMin, pageMax, elementCounts, functionCounts } = combinedWorkpadsInfo;

  const pageTotal = arraySum(pageCounts);
  const elementsTotal = arraySum(elementCounts);
  const functionsTotal = arraySum(functionCounts);
  const pagesInfo =
    workpadsInfo.length > 0
      ? {
          total: pageTotal,
          per_workpad: {
            avg: pageTotal / pageCounts.length,
            min: pageMin,
            max: pageMax,
          },
        }
      : undefined;
  const elementsInfo =
    pageTotal > 0
      ? {
          total: elementsTotal,
          per_page: {
            avg: elementsTotal / elementCounts.length,
            min: arrayMin(elementCounts),
            max: arrayMax(elementCounts),
          },
        }
      : undefined;
  const functionsInfo =
    elementsTotal > 0
      ? {
          total: functionsTotal,
          in_use: Array.from(functionSet),
          per_element: {
            avg: functionsTotal / functionCounts.length,
            min: arrayMin(functionCounts),
            max: arrayMax(functionCounts),
          },
        }
      : undefined;

  return {
    workpads: { total: workpadsInfo.length },
    pages: pagesInfo,
    elements: elementsInfo,
    functions: functionsInfo,
  };
}

const workpadCollector: TelemetryCollector = async function customElementCollector(
  server,
  callCluster
) {
  const index = server.config().get<string>('kibana.index');
  const searchParams: SearchParams = {
    size: 10000, // elasticsearch index.max_result_window default value
    index,
    ignoreUnavailable: true,
    filterPath: ['hits.hits._source.canvas-workpad', '-hits.hits._source.canvas-workpad.assets'],
    body: { query: { bool: { filter: { term: { type: CANVAS_TYPE } } } } },
  };

  const esResponse = await callCluster<WorkpadSearch>('search', searchParams);
  if (get(esResponse, 'hits.hits.length') > 0) {
    return handleResponse(esResponse);
  }

  return {};
};

export { workpadCollector };
