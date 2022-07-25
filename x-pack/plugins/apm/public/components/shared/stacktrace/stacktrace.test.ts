/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Stackframe } from '../../../../typings/es_schemas/raw/fields/stackframe';
import { getGroupedStackframes } from '.';
import stacktracesMock from './__fixtures__/stacktraces.json';

describe('Stacktrace', () => {
  describe('getGroupedStackframes', () => {
    it('collapses the library frames into a set of grouped stackframes', () => {
      expect(
        getGroupedStackframes(stacktracesMock as Stackframe[]).every(
          (group) => group.stackframes.length > 0
        )
      ).toEqual(true);
    });

    it('should group stackframes when `library_frame` is identical and `exclude_from_grouping` is false', () => {
      const stackframes = [
        {
          library_frame: false,
          exclude_from_grouping: false,
          filename: 'file-a.txt',
        },
        {
          library_frame: false,
          exclude_from_grouping: false,
          filename: 'file-b.txt',
        },
        {
          library_frame: true,
          exclude_from_grouping: false,
          filename: 'file-c.txt',
        },
        {
          library_frame: true,
          exclude_from_grouping: false,
          filename: 'file-d.txt',
        },
      ] as Stackframe[];

      const result = getGroupedStackframes(stackframes);

      expect(result).toEqual([
        {
          excludeFromGrouping: false,
          isLibraryFrame: false,
          stackframes: [
            {
              exclude_from_grouping: false,
              filename: 'file-a.txt',
              library_frame: false,
            },
            {
              exclude_from_grouping: false,
              filename: 'file-b.txt',
              library_frame: false,
            },
          ],
        },
        {
          excludeFromGrouping: false,
          isLibraryFrame: true,
          stackframes: [
            {
              exclude_from_grouping: false,
              filename: 'file-c.txt',
              library_frame: true,
            },
            {
              exclude_from_grouping: false,
              filename: 'file-d.txt',
              library_frame: true,
            },
          ],
        },
      ]);
    });

    it('should not group stackframes when `library_frame` is the different', () => {
      const stackframes = [
        {
          library_frame: false,
          exclude_from_grouping: false,
          filename: 'file-a.txt',
        },
        {
          library_frame: true,
          exclude_from_grouping: false,
          filename: 'file-b.txt',
        },
      ] as Stackframe[];
      const result = getGroupedStackframes(stackframes);
      expect(result).toEqual([
        {
          excludeFromGrouping: false,
          isLibraryFrame: false,
          stackframes: [
            {
              exclude_from_grouping: false,
              filename: 'file-a.txt',
              library_frame: false,
            },
          ],
        },
        {
          excludeFromGrouping: false,
          isLibraryFrame: true,
          stackframes: [
            {
              exclude_from_grouping: false,
              filename: 'file-b.txt',
              library_frame: true,
            },
          ],
        },
      ]);
    });

    it('should not group stackframes when `exclude_from_grouping` is true', () => {
      const stackframes = [
        {
          library_frame: false,
          exclude_from_grouping: false,
          filename: 'file-a.txt',
        },
        {
          library_frame: false,
          exclude_from_grouping: true,
          filename: 'file-b.txt',
        },
      ] as Stackframe[];
      const result = getGroupedStackframes(stackframes);
      expect(result).toEqual([
        {
          excludeFromGrouping: false,
          isLibraryFrame: false,
          stackframes: [
            {
              exclude_from_grouping: false,
              filename: 'file-a.txt',
              library_frame: false,
            },
          ],
        },
        {
          excludeFromGrouping: true,
          isLibraryFrame: false,
          stackframes: [
            {
              exclude_from_grouping: true,
              filename: 'file-b.txt',
              library_frame: false,
            },
          ],
        },
      ]);
    });

    it('should handle empty stackframes', () => {
      const result = getGroupedStackframes([] as Stackframe[]);
      expect(result).toHaveLength(0);
    });

    it('should handle one stackframe', () => {
      const result = getGroupedStackframes([
        stacktracesMock[0],
      ] as Stackframe[]);
      expect(result).toHaveLength(1);
      expect(result[0].stackframes).toHaveLength(1);
    });
  });
});
