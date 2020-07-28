/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IStackframe } from '../../../../../typings/es_schemas/raw/fields/stackframe';
import { getGroupedStackframes } from '../index';
import stacktracesMock from './stacktraces.json';

describe('Stacktrace/index', () => {
  describe('getGroupedStackframes', () => {
    it('should collapse the library frames into a set of grouped stackframes', () => {
      const result = getGroupedStackframes(stacktracesMock as IStackframe[]);
      expect(result).toMatchSnapshot();
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
      ] as IStackframe[];

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
      ] as IStackframe[];
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
      ] as IStackframe[];
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
      const result = getGroupedStackframes([] as IStackframe[]);
      expect(result).toHaveLength(0);
    });

    it('should handle one stackframe', () => {
      const result = getGroupedStackframes([
        stacktracesMock[0],
      ] as IStackframe[]);
      expect(result).toHaveLength(1);
      expect(result[0].stackframes).toHaveLength(1);
    });
  });
});
