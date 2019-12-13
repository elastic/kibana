/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import clonedeep from 'lodash.clonedeep';
import { summarizeWorkpads } from './workpad_collector';
import { workpads } from '../../__tests__/fixtures/workpads';

describe('usage collector handle es response data', () => {
  it('should summarize workpads, pages, and elements', () => {
    const usage = summarizeWorkpads(workpads);
    expect(usage).toEqual({
      workpads: {
        total: 6, // num workpad documents in .kibana index
      },
      pages: {
        total: 16, // num pages in all the workpads
        per_workpad: { avg: 2.6666666666666665, min: 1, max: 4 },
      },
      elements: {
        total: 34, // num elements in all the pages
        per_page: { avg: 2.125, min: 1, max: 5 },
      },
      functions: {
        per_element: { avg: 4, min: 2, max: 7 },
        total: 36,
        in_use: [
          'demodata',
          'ply',
          'rowCount',
          'as',
          'staticColumn',
          'math',
          'mapColumn',
          'sort',
          'pointseries',
          'plot',
          'seriesStyle',
          'filters',
          'markdown',
          'render',
          'getCell',
          'repeatImage',
          'pie',
          'table',
          'image',
          'shape',
        ],
      },
    });
  });

  it('should collect correctly if an expression has null as an argument (possible sub-expression)', () => {
    const workpad = clonedeep(workpads[0]);
    workpad.pages[0].elements[0].expression = 'toast butter=null';

    const mockWorkpads = [workpad];
    const usage = summarizeWorkpads(mockWorkpads);
    expect(usage).toEqual({
      workpads: { total: 1 },
      pages: { total: 1, per_workpad: { avg: 1, min: 1, max: 1 } },
      elements: { total: 1, per_page: { avg: 1, min: 1, max: 1 } },
      functions: { total: 1, in_use: ['toast'], per_element: { avg: 1, min: 1, max: 1 } },
    });
  });

  it('should fail gracefully if workpad has 0 pages (corrupted workpad)', () => {
    const workpad = clonedeep(workpads[0]);
    workpad.pages = [];
    const mockWorkpadsCorrupted = [workpad];
    const usage = summarizeWorkpads(mockWorkpadsCorrupted);
    expect(usage).toEqual({
      workpads: { total: 1 },
      pages: { total: 0, per_workpad: { avg: 0, min: 0, max: 0 } },
      elements: undefined,
      functions: undefined,
    });
  });

  it('should fail gracefully in general', () => {
    const usage = summarizeWorkpads([]);
    expect(usage).toEqual({});
  });
});
