/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SearchParams } from 'elasticsearch';
import { sum as arraySum, min as arrayMin, max as arrayMax, get } from 'lodash';
import { CANVAS_TYPE } from '../../common/lib/constants';
import { collectFns } from './collector_helpers';
import { TelemetryCollector, CanvasWorkpad } from '../../types';
import { parseExpression } from '../../../../../src/plugins/expressions/common';

interface WorkpadSearch {
  [CANVAS_TYPE]: CanvasWorkpad;
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
  templatesUsage?: {
    total: number;
    by_name: Record<string, number>;
  };
}

/**
  Gather statistic about the given workpads
  @param workpadDocs a collection of workpad documents
  @returns Workpad Telemetry Data
*/
export function summarizeWorkpads(workpadDocs: CanvasWorkpad[]): WorkpadTelemetry {
  const functionSet = new Set<string>();

  if (workpadDocs.length === 0) {
    return {};
  }

  // make a summary of info about each workpad
  const workpadsInfo = workpadDocs.map((workpad) => {
    let pages = { count: 0 };
    try {
      pages = { count: workpad.pages.length };
    } catch (err) {
      // eslint-disable-next-line
      console.warn(err, workpad);
    }
    const elementCounts = workpad.pages.reduce<number[]>(
      (accum, page) => accum.concat(page.elements.length),
      []
    );
    const functionCounts = workpad.pages.reduce<number[]>((accum, page) => {
      return page.elements.map((element) => {
        const ast = parseExpression(element.expression);
        collectFns(ast, (cFunction) => {
          functionSet.add(cFunction);
        });
        return ast.chain.length; // get the number of parts in the expression
      });
    }, []);

    return { pages, elementCounts, functionCounts, template: workpad.fromTemplate };
  });

  // combine together info from across the workpads
  const combinedWorkpadsInfo = workpadsInfo.reduce<{
    pageMin: number;
    pageMax: number;
    pageCounts: number[];
    elementCounts: number[];
    functionCounts: number[];
    templates: string[];
  }>(
    (accum, pageInfo) => {
      const { pages, elementCounts, functionCounts, template } = pageInfo;

      return {
        pageMin: pages.count < accum.pageMin ? pages.count : accum.pageMin,
        pageMax: pages.count > accum.pageMax ? pages.count : accum.pageMax,
        pageCounts: accum.pageCounts.concat(pages.count),
        elementCounts: accum.elementCounts.concat(elementCounts),
        functionCounts: accum.functionCounts.concat(functionCounts),
        templates: template ? accum.templates.concat([template]) : accum.templates,
      };
    },
    {
      pageMin: Infinity,
      pageMax: -Infinity,
      pageCounts: [],
      elementCounts: [],
      functionCounts: [],
      templates: [],
    }
  );
  const {
    pageCounts,
    pageMin,
    pageMax,
    elementCounts,
    functionCounts,
    templates,
  } = combinedWorkpadsInfo;

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
            min: arrayMin(elementCounts) || 0,
            max: arrayMax(elementCounts) || 0,
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
            min: arrayMin(functionCounts) || 0,
            max: arrayMax(functionCounts) || 0,
          },
        }
      : undefined;

  const countByTemplateName = templates.reduce((accum: Record<string, number>, t: string) => {
    accum[t] = accum[t] ? accum[t] + 1 : 1;

    return accum;
  }, {});

  const templatesInfo = {
    total: templates.length,
    by_name: countByTemplateName,
  };

  return {
    workpads: { total: workpadsInfo.length },
    pages: pagesInfo,
    elements: elementsInfo,
    functions: functionsInfo,
    templatesUsage: templatesInfo,
  };
}

const workpadCollector: TelemetryCollector = async function (kibanaIndex, callCluster) {
  const searchParams: SearchParams = {
    size: 10000, // elasticsearch index.max_result_window default value
    index: kibanaIndex,
    ignoreUnavailable: true,
    filterPath: ['hits.hits._source.canvas-workpad', '-hits.hits._source.canvas-workpad.assets'],
    body: { query: { bool: { filter: { term: { type: CANVAS_TYPE } } } } },
  };

  const esResponse = await callCluster<WorkpadSearch>('search', searchParams);

  if (get(esResponse, 'hits.hits.length') > 0) {
    const workpads = esResponse.hits.hits.map((hit) => hit._source[CANVAS_TYPE]);
    return summarizeWorkpads(workpads);
  }

  return {};
};

export { workpadCollector };
