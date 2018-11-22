/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { sum as arraySum, min as arrayMin, max as arrayMax, get } from 'lodash';
import { CANVAS_USAGE_TYPE, CANVAS_TYPE } from '../../common/lib/constants';
import { fromExpression } from '../../common/lib/ast';

/*
 * @param ast: an ast that includes functions to track
 * @param cb: callback to do something with a function that has been found
 */
const collectFns = (ast, cb) => {
  if (ast.type === 'expression') {
    ast.chain.forEach(({ function: cFunction, arguments: cArguments }) => {
      cb(cFunction);

      // recurse the argumetns and update the set along the way
      Object.keys(cArguments).forEach(argName => {
        cArguments[argName].forEach(subAst => {
          if (subAst != null) collectFns(subAst, cb);
        });
      });
    });
  }
};

export function handleResponse({ hits }) {
  const workpadDocs = get(hits, 'hits', null);
  if (workpadDocs == null) return;

  const functionSet = new Set();

  // make a summary of info about each workpad
  const workpadsInfo = workpadDocs.map(hit => {
    const workpad = hit._source[CANVAS_TYPE];

    let pages;
    try {
      pages = { count: workpad.pages.length };
    } catch (err) {
      console.warn(err, workpad);
    }
    const elementCounts = workpad.pages.reduce(
      (accum, page) => accum.concat(page.elements.length),
      []
    );
    const functionCounts = workpad.pages.reduce((accum, page) => {
      return page.elements.map(element => {
        const ast = fromExpression(element.expression);
        collectFns(ast, cFunction => {
          functionSet.add(cFunction);
        });
        return ast.chain.length; // get the number of parts in the expression
      });
    }, []);
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
      pageCounts: [],
      elementCounts: [],
      functionCounts: [],
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

export function registerCanvasUsageCollector(server) {
  const index = server.config().get('kibana.index');
  const collector = server.usage.collectorSet.makeUsageCollector({
    type: CANVAS_USAGE_TYPE,
    fetch: async callCluster => {
      const searchParams = {
        size: 10000, // elasticsearch index.max_result_window default value
        index,
        ignoreUnavailable: true,
        filterPath: ['hits.hits._source.canvas-workpad'],
        body: { query: { bool: { filter: { term: { type: CANVAS_TYPE } } } } },
      };

      const esResponse = await callCluster('search', searchParams);
      if (get(esResponse, 'hits.hits.length') > 0) return handleResponse(esResponse);
    },
  });

  server.usage.collectorSet.register(collector);
}
