/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { cloneDeep } from 'lodash';
import { summarizeWorkpads } from './workpad_collector';
import { workpads } from '../../__fixtures__/workpads';
import moment from 'moment';

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
        in_use_30d: [],
        in_use_90d: [],
      },
      variables: {
        total: 7,
        per_workpad: {
          avg: 1.1666666666666667,
          min: 0,
          max: 3,
        },
      },
    });
  });

  it('should collect correctly if an expression has null as an argument (possible sub-expression)', () => {
    const workpad = cloneDeep(workpads[0]);
    workpad.pages[0].elements[0].expression = 'toast butter=null';

    const mockWorkpads = [workpad];
    const usage = summarizeWorkpads(mockWorkpads);
    expect(usage).toEqual({
      workpads: { total: 1 },
      pages: { total: 1, per_workpad: { avg: 1, min: 1, max: 1 } },
      elements: { total: 1, per_page: { avg: 1, min: 1, max: 1 } },
      functions: {
        total: 1,
        in_use: ['toast'],
        in_use_30d: [],
        in_use_90d: [],
        per_element: { avg: 1, min: 1, max: 1 },
      },
      variables: { total: 1, per_workpad: { avg: 1, min: 1, max: 1 } },
    });
  });

  it('should fail gracefully if workpad has 0 pages (corrupted workpad)', () => {
    const workpad = cloneDeep(workpads[0]);
    workpad.pages = [];
    const mockWorkpadsCorrupted = [workpad];
    const usage = summarizeWorkpads(mockWorkpadsCorrupted);
    expect(usage).toEqual({
      workpads: { total: 1 },
      pages: { total: 0, per_workpad: { avg: 0, min: 0, max: 0 } },
      elements: undefined,
      functions: undefined,
      variables: { total: 1, per_workpad: { avg: 1, min: 1, max: 1 } }, // Variables still possible even with no pages
    });
  });

  it('should handle cases where the version workpad might not have variables', () => {
    const workpad = cloneDeep(workpads[0]);
    // @ts-ignore
    workpad.variables = undefined;

    const mockWorkpadsOld = [workpad];
    const usage = summarizeWorkpads(mockWorkpadsOld);
    expect(usage).toEqual({
      workpads: { total: 1 },
      pages: { total: 1, per_workpad: { avg: 1, min: 1, max: 1 } },
      elements: { total: 1, per_page: { avg: 1, min: 1, max: 1 } },
      functions: {
        total: 7,
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
        ],
        in_use_30d: [],
        in_use_90d: [],
        per_element: { avg: 7, min: 7, max: 7 },
      },
      variables: { total: 0, per_workpad: { avg: 0, min: 0, max: 0 } }, // Variables still possible even with no pages
    });
  });

  it('should fail gracefully in general', () => {
    const usage = summarizeWorkpads([]);
    expect(usage).toEqual({});
  });

  describe('functions', () => {
    it('collects funtions used in the most recent 30d and 90d', () => {
      const thirtyDayFunction = '30d';
      const ninetyDayFunction = '90d';
      const otherFunction = '180d';

      const workpad30d = cloneDeep(workpads[0]);
      const workpad90d = cloneDeep(workpads[0]);
      const workpad180d = cloneDeep(workpads[0]);

      const now = moment();

      workpad30d['@timestamp'] = now.subtract(1, 'day').toDate().toISOString();
      workpad90d['@timestamp'] = now.subtract(80, 'day').toDate().toISOString();
      workpad180d['@timestamp'] = now.subtract(180, 'day').toDate().toISOString();

      workpad30d.pages[0].elements[0].expression = `${thirtyDayFunction}`;
      workpad90d.pages[0].elements[0].expression = `${ninetyDayFunction}`;
      workpad180d.pages[0].elements[0].expression = `${otherFunction}`;

      const mockWorkpads = [workpad30d, workpad90d, workpad180d];
      const usage = summarizeWorkpads(mockWorkpads);

      expect(usage.functions?.in_use_30d).toHaveLength(1);
      expect(usage.functions?.in_use_30d).toEqual(expect.arrayContaining([thirtyDayFunction]));

      expect(usage.functions?.in_use_90d).toHaveLength(2);
      expect(usage.functions?.in_use_90d).toEqual(
        expect.arrayContaining([thirtyDayFunction, ninetyDayFunction])
      );

      expect(usage.functions?.in_use).toHaveLength(3);
      expect(usage.functions?.in_use).toEqual(
        expect.arrayContaining([thirtyDayFunction, ninetyDayFunction, otherFunction])
      );
    });
  });
});
