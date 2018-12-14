/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Stackframe } from '../../../../../typings/es_schemas/APMDoc';
import { getGroupedStackframes, hasSourceLines } from '../stacktraceUtils';
import stacktracesMock from './stacktraces.json';

const stackframeMockWithSource = stacktracesMock[0];
const stackframeMockWithoutSource = stacktracesMock[1];

describe('stactraceUtils', () => {
  describe('getGroupedStackframes', () => {
    it('should collapse the library frames into a set of grouped stackframes', () => {
      const result = getGroupedStackframes(stacktracesMock as Stackframe[]);
      expect(result).toMatchSnapshot();
    });

    it('should group stackframes when `library_frame` is identical and `exclude_from_grouping` is false', () => {
      const stackframes = [
        {
          library_frame: false,
          exclude_from_grouping: false,
          filename: 'file-a.txt'
        },
        {
          library_frame: false,
          exclude_from_grouping: false,
          filename: 'file-b.txt'
        },
        {
          library_frame: true,
          exclude_from_grouping: false,
          filename: 'file-c.txt'
        },
        {
          library_frame: true,
          exclude_from_grouping: false,
          filename: 'file-d.txt'
        }
      ] as Stackframe[];

      const result = getGroupedStackframes(stackframes);

      expect(result).toEqual([
        {
          isLibraryFrame: false,
          stackframes: [
            {
              exclude_from_grouping: false,
              filename: 'file-a.txt',
              library_frame: false
            },
            {
              exclude_from_grouping: false,
              filename: 'file-b.txt',
              library_frame: false
            }
          ]
        },
        {
          isLibraryFrame: true,
          stackframes: [
            {
              exclude_from_grouping: false,
              filename: 'file-c.txt',
              library_frame: true
            },
            {
              exclude_from_grouping: false,
              filename: 'file-d.txt',
              library_frame: true
            }
          ]
        }
      ]);
    });

    it('should not group stackframes when `library_frame` is the different', () => {
      const stackframes = [
        {
          library_frame: false,
          exclude_from_grouping: false,
          filename: 'file-a.txt'
        },
        {
          library_frame: true,
          exclude_from_grouping: false,
          filename: 'file-b.txt'
        }
      ] as Stackframe[];
      const result = getGroupedStackframes(stackframes);
      expect(result).toEqual([
        {
          isLibraryFrame: false,
          stackframes: [
            {
              exclude_from_grouping: false,
              filename: 'file-a.txt',
              library_frame: false
            }
          ]
        },
        {
          isLibraryFrame: true,
          stackframes: [
            {
              exclude_from_grouping: false,
              filename: 'file-b.txt',
              library_frame: true
            }
          ]
        }
      ]);
    });

    it('should not group stackframes when `exclude_from_grouping` is true', () => {
      const stackframes = [
        {
          library_frame: false,
          exclude_from_grouping: false,
          filename: 'file-a.txt'
        },
        {
          library_frame: false,
          exclude_from_grouping: true,
          filename: 'file-b.txt'
        }
      ] as Stackframe[];
      const result = getGroupedStackframes(stackframes);
      expect(result).toEqual([
        {
          isLibraryFrame: false,
          stackframes: [
            {
              exclude_from_grouping: false,
              filename: 'file-a.txt',
              library_frame: false
            }
          ]
        },
        {
          isLibraryFrame: false,
          stackframes: [
            {
              exclude_from_grouping: true,
              filename: 'file-b.txt',
              library_frame: false
            }
          ]
        }
      ]);
    });

    it('should handle empty stackframes', () => {
      const result = getGroupedStackframes([] as Stackframe[]);
      expect(result).toHaveLength(0);
    });

    it('should handle one stackframe', () => {
      const result = getGroupedStackframes([
        stacktracesMock[0]
      ] as Stackframe[]);
      expect(result).toHaveLength(1);
      expect(result[0].stackframes).toHaveLength(1);
    });
  });

  describe('hasSourceLines', () => {
    it('should return true given a stackframe with a source context', () => {
      const result = hasSourceLines(stackframeMockWithSource as Stackframe);
      expect(result).toBe(true);
    });
    it('should return false given a stackframe with no source context', () => {
      const result = hasSourceLines(stackframeMockWithoutSource as Stackframe);
      expect(result).toBe(false);
    });
  });
});
