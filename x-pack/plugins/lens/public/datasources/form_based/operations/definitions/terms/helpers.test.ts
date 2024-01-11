/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { dataPluginMock } from '@kbn/data-plugin/public/mocks';
import { coreMock as corePluginMock } from '@kbn/core/public/mocks';
import type { FramePublicAPI } from '../../../../../types';
import type { CountIndexPatternColumn } from '..';
import type { TermsIndexPatternColumn } from './types';
import type { GenericIndexPatternColumn } from '../../../form_based';
import { createMockedIndexPattern } from '../../../mocks';
import {
  getDisallowedTermsMessage,
  getMultiTermsScriptedFieldErrorMessage,
  isSortableByColumn,
  getOtherBucketSwitchDefault,
} from './helpers';
import { ReferenceBasedIndexPatternColumn } from '../column_types';
import type { PercentileRanksIndexPatternColumn } from '../percentile_ranks';
import { MULTI_KEY_VISUAL_SEPARATOR } from './constants';
import { MovingAverageIndexPatternColumn } from '../calculations';

jest.mock('@kbn/unified-field-list/src/services/field_stats', () => ({
  loadFieldStats: jest.fn().mockResolvedValue({
    topValues: {
      buckets: [
        {
          key: 'A',
        },
        {
          key: 'B',
        },
      ],
    },
  }),
}));

const indexPattern = createMockedIndexPattern();
const dataMock = dataPluginMock.createStartContract();
const coreMock = corePluginMock.createStart();

function getStringBasedOperationColumn(
  field = 'source',
  params?: Partial<TermsIndexPatternColumn['params']>
): TermsIndexPatternColumn {
  return {
    label: `Top value of ${field}`,
    dataType: 'string',
    isBucketed: true,
    operationType: 'terms',
    params: {
      orderBy: { type: 'alphabetical' },
      size: 3,
      orderDirection: 'asc',
      ...params,
    },
    sourceField: field,
  };
}

function getLayer(
  col1: TermsIndexPatternColumn = getStringBasedOperationColumn(),
  cols?: GenericIndexPatternColumn[]
) {
  const colsObject = cols
    ? cols.reduce((memo, col, i) => ({ ...memo, [`col${i + 2}`]: col }), {})
    : {};
  return {
    indexPatternId: '1',
    columnOrder: ['col1', ...Object.keys(colsObject)],
    columns: {
      col1,
      ...colsObject,
    },
  };
}

function getCountOperationColumn(
  params?: Partial<CountIndexPatternColumn>
): GenericIndexPatternColumn {
  return {
    label: 'Count',
    dataType: 'number',
    isBucketed: false,
    sourceField: '___records___',
    operationType: 'count',
    ...params,
  };
}

describe('getMultiTermsScriptedFieldErrorMessage()', () => {
  it('should return no error message for a single field', () => {
    expect(
      getMultiTermsScriptedFieldErrorMessage(getLayer(), 'col1', indexPattern)
    ).toBeUndefined();
  });

  it('should return no error message for a scripted field when single', () => {
    const col = getStringBasedOperationColumn('scripted');
    expect(
      getMultiTermsScriptedFieldErrorMessage(getLayer(col), 'col1', indexPattern)
    ).toBeUndefined();
  });

  it('should return an error message for a scripted field when there are multiple fields', () => {
    const col = getStringBasedOperationColumn('scripted', { secondaryFields: ['bytes'] });
    expect(getMultiTermsScriptedFieldErrorMessage(getLayer(col), 'col1', indexPattern)).toBe(
      'Scripted fields are not supported when using multiple fields, found scripted'
    );
  });

  it('should return no error message for multiple "native" fields', () => {
    const col = getStringBasedOperationColumn('source', { secondaryFields: ['dest'] });
    expect(
      getMultiTermsScriptedFieldErrorMessage(getLayer(col), 'col1', indexPattern)
    ).toBeUndefined();
  });

  it('should list all scripted fields in the error message', () => {
    const col = getStringBasedOperationColumn('scripted', {
      secondaryFields: ['scripted', 'scripted', 'scripted'],
    });
    expect(getMultiTermsScriptedFieldErrorMessage(getLayer(col), 'col1', indexPattern)).toBe(
      'Scripted fields are not supported when using multiple fields, found scripted, scripted, scripted, scripted'
    );
  });
});

describe('getDisallowedTermsMessage()', () => {
  it('should return no error if no shifted dimensions are defined', () => {
    expect(getDisallowedTermsMessage(getLayer(), 'col1', indexPattern)).toBeUndefined();
    expect(
      getDisallowedTermsMessage(
        getLayer(getStringBasedOperationColumn(), [getCountOperationColumn()]),
        'col1',
        indexPattern
      )
    ).toBeUndefined();
  });

  it('should return no error for a single dimension shifted', () => {
    expect(
      getDisallowedTermsMessage(
        getLayer(getStringBasedOperationColumn(), [getCountOperationColumn({ timeShift: '1w' })]),
        'col1',
        indexPattern
      )
    ).toBeUndefined();
  });

  it('should return no error for a single dimension shifted which is wrapped in a referencing column', () => {
    expect(
      getDisallowedTermsMessage(
        getLayer(getStringBasedOperationColumn(), [
          // count will inherit the shift from the moving average
          getCountOperationColumn({ timeShift: undefined }),
          {
            label: 'Moving average',
            dataType: 'number',
            operationType: 'moving_average',
            isBucketed: false,
            scale: 'ratio',
            references: ['col2'],
            timeShift: '3h',
            params: {
              window: 5,
            },
            customLabel: true,
          } as MovingAverageIndexPatternColumn,
        ]),
        'col1',
        indexPattern
      )
    ).toBeUndefined();
  });

  it('should return no for multiple fields with no shifted dimensions', () => {
    expect(getDisallowedTermsMessage(getLayer(), 'col1', indexPattern)).toBeUndefined();
    expect(
      getDisallowedTermsMessage(
        getLayer(getStringBasedOperationColumn(), [getCountOperationColumn()]),
        'col1',
        indexPattern
      )
    ).toBeUndefined();
  });

  it('should return an error for multiple dimensions shifted for a single term', () => {
    expect(
      getDisallowedTermsMessage(
        getLayer(getStringBasedOperationColumn(), [
          getCountOperationColumn(),
          getCountOperationColumn({ timeShift: '1w' }),
        ]),
        'col1',
        indexPattern
      )
    ).toEqual(
      expect.objectContaining({
        message:
          'In a single layer, you are unable to combine metrics with different time shifts and dynamic top values. Use the same time shift value for all metrics, or use filters instead of top values.',
        fixAction: expect.objectContaining({ label: 'Use filters' }),
      })
    );
  });

  it('should return an error for multiple dimensions shifted for multiple terms', () => {
    expect(
      getDisallowedTermsMessage(
        getLayer(getStringBasedOperationColumn('source', { secondaryFields: ['bytes'] }), [
          getCountOperationColumn(),
          getCountOperationColumn({ timeShift: '1w' }),
        ]),
        'col1',
        indexPattern
      )
    ).toEqual(
      expect.objectContaining({
        message:
          'In a single layer, you are unable to combine metrics with different time shifts and dynamic top values. Use the same time shift value for all metrics, or use filters instead of top values.',
        fixAction: expect.objectContaining({ label: 'Use filters' }),
      })
    );
  });

  it('should propose a fixAction for single term when no data is available', async () => {
    const fixAction = getDisallowedTermsMessage(
      getLayer(getStringBasedOperationColumn(), [
        getCountOperationColumn(),
        getCountOperationColumn({ timeShift: '1w' }),
      ]),
      'col1',
      indexPattern
    )!.fixAction.newState;
    const newLayer = await fixAction(
      dataMock,
      coreMock,
      {
        query: { language: 'kuery', query: 'a: b' },
        filters: [],
        dateRange: {
          fromDate: '2020',
          toDate: '2021',
        },
      } as unknown as FramePublicAPI,
      'first'
    );

    expect(newLayer.columns.col1).toEqual(
      expect.objectContaining({
        operationType: 'filters',
        params: {
          filters: [
            {
              input: {
                language: 'kuery',
                query: 'source: "A"',
              },
              label: 'A',
            },
            {
              input: {
                language: 'kuery',
                query: 'source: "B"',
              },
              label: 'B',
            },
          ],
        },
      })
    );
  });

  it('should propose a fixAction for single term when data is available with current top values', async () => {
    const fixAction = getDisallowedTermsMessage(
      getLayer(getStringBasedOperationColumn(), [
        getCountOperationColumn(),
        getCountOperationColumn({ timeShift: '1w' }),
      ]),
      'col1',
      indexPattern
    )!.fixAction.newState;
    const newLayer = await fixAction(
      dataMock,
      coreMock,
      {
        query: { language: 'kuery', query: 'a: b' },
        filters: [],
        dateRange: {
          fromDate: '2020',
          toDate: '2021',
        },
        activeData: {
          first: {
            columns: [{ id: 'col1', meta: { field: 'source' } }],
            rows: [{ col1: 'myTerm' }, { col1: 'myOtherTerm' }],
          },
        },
      } as unknown as FramePublicAPI,
      'first'
    );

    expect(newLayer.columns.col1).toEqual(
      expect.objectContaining({
        operationType: 'filters',
        params: {
          filters: [
            { input: { language: 'kuery', query: 'source: "myTerm"' }, label: 'myTerm' },
            { input: { language: 'kuery', query: 'source: "myOtherTerm"' }, label: 'myOtherTerm' },
          ],
        },
      })
    );
  });

  it('should propose a fixAction for multiple term when no data is available', async () => {
    const fixAction = getDisallowedTermsMessage(
      getLayer(getStringBasedOperationColumn('source', { secondaryFields: ['bytes'] }), [
        getCountOperationColumn(),
        getCountOperationColumn({ timeShift: '1w' }),
      ]),
      'col1',
      indexPattern
    )!.fixAction.newState;
    const newLayer = await fixAction(
      dataMock,
      coreMock,
      {
        query: { language: 'kuery', query: 'a: b' },
        filters: [],
        dateRange: {
          fromDate: '2020',
          toDate: '2021',
        },
      } as unknown as FramePublicAPI,
      'first'
    );

    expect(newLayer.columns.col1).toEqual(
      expect.objectContaining({
        operationType: 'filters',
        params: {
          filters: [
            {
              input: {
                language: 'kuery',
                query: 'source: * AND bytes: *',
              },
              label: `source: * ${MULTI_KEY_VISUAL_SEPARATOR} bytes: *`,
            },
          ],
        },
      })
    );
  });

  it('should propose a fixAction for multiple term when data is available with current top values', async () => {
    const fixAction = getDisallowedTermsMessage(
      getLayer(getStringBasedOperationColumn('source', { secondaryFields: ['bytes'] }), [
        getCountOperationColumn(),
        getCountOperationColumn({ timeShift: '1w' }),
      ]),
      'col1',
      indexPattern
    )!.fixAction.newState;
    const newLayer = await fixAction(
      dataMock,
      coreMock,
      {
        query: { language: 'kuery', query: 'a: b' },
        filters: [],
        dateRange: {
          fromDate: '2020',
          toDate: '2021',
        },
        activeData: {
          first: {
            columns: [{ id: 'col1', meta: { field: undefined } }],
            rows: [
              { col1: { keys: ['myTerm', '4000'] } },
              { col1: { keys: ['myOtherTerm', '8000'] } },
            ],
          },
        },
      } as unknown as FramePublicAPI,
      'first'
    );

    expect(newLayer.columns.col1).toEqual(
      expect.objectContaining({
        operationType: 'filters',
        params: {
          filters: [
            {
              input: { language: 'kuery', query: 'source: "myTerm" AND bytes: "4000"' },
              label: `source: myTerm ${MULTI_KEY_VISUAL_SEPARATOR} bytes: 4000`,
            },
            {
              input: { language: 'kuery', query: 'source: "myOtherTerm" AND bytes: "8000"' },
              label: `source: myOtherTerm ${MULTI_KEY_VISUAL_SEPARATOR} bytes: 8000`,
            },
          ],
        },
      })
    );
  });
});

describe('isSortableByColumn()', () => {
  it('should sort by the given column', () => {
    expect(
      isSortableByColumn(
        getLayer(getStringBasedOperationColumn(), [getCountOperationColumn()]),
        'col2'
      )
    ).toBeTruthy();
  });

  it('should not be sortable by full-reference columns', () => {
    expect(
      isSortableByColumn(
        getLayer(getStringBasedOperationColumn(), [
          {
            label: `Difference of Average of bytes`,
            dataType: 'number',
            operationType: 'differences',
            isBucketed: false,
            references: ['colX'],
            scale: 'ratio',
          },
        ]),
        'col2'
      )
    ).toBeFalsy();
  });

  it('should not be sortable by referenced columns', () => {
    expect(
      isSortableByColumn(
        getLayer(getStringBasedOperationColumn(), [
          {
            label: `Difference of Average of bytes`,
            dataType: 'number',
            operationType: 'differences',
            isBucketed: false,
            references: ['col3'],
            scale: 'ratio',
          },
          {
            label: 'Average',
            dataType: 'number',
            isBucketed: false,
            sourceField: 'bytes',
            operationType: 'average',
          },
        ]),
        'col3'
      )
    ).toBeFalsy();
  });

  it('should not be sortable by a managed column', () => {
    expect(
      isSortableByColumn(
        getLayer(getStringBasedOperationColumn(), [
          {
            label: 'Static value: 100',
            dataType: 'number',
            operationType: 'static_value',
            isBucketed: false,
            scale: 'ratio',
            params: { value: 100 },
            references: [],
          } as ReferenceBasedIndexPatternColumn,
        ]),
        'col2'
      )
    ).toBeFalsy();
  });

  it('should not be sortable by percentile_rank column with non integer value', () => {
    expect(
      isSortableByColumn(
        getLayer(getStringBasedOperationColumn(), [
          {
            label: 'Percentile rank (1024.5) of bytes',
            dataType: 'number',
            operationType: 'percentile_rank',
            sourceField: 'bytes',
            isBucketed: false,
            scale: 'ratio',
            params: { value: 1024.5 },
          } as PercentileRanksIndexPatternColumn,
        ]),
        'col2'
      )
    ).toBeFalsy();
  });

  it('should be sortable by percentile_rank column with integer value', () => {
    expect(
      isSortableByColumn(
        getLayer(getStringBasedOperationColumn(), [
          {
            label: 'Percentile rank (1024) of bytes',
            dataType: 'number',
            operationType: 'percentile_rank',
            sourceField: 'bytes',
            isBucketed: false,
            scale: 'ratio',
            params: { value: 1024 },
          } as PercentileRanksIndexPatternColumn,
        ]),
        'col2'
      )
    ).toBeTruthy();
  });

  describe('last_value operation', () => {
    it('should NOT be sortable when using top-hit agg', () => {
      expect(
        isSortableByColumn(
          getLayer(getStringBasedOperationColumn(), [
            {
              label: 'Last Value',
              dataType: 'number',
              isBucketed: false,
              sourceField: 'bytes',
              operationType: 'last_value',
              params: {
                sortField: 'time',
                showArrayValues: true,
              },
            } as GenericIndexPatternColumn,
          ]),
          'col2'
        )
      ).toBeFalsy();
    });

    it('should NOT be sortable when NOT using date or number source field', () => {
      expect(
        isSortableByColumn(
          getLayer(getStringBasedOperationColumn(), [
            {
              label: 'Last Value',
              dataType: 'string',
              isBucketed: false,
              sourceField: 'some_string_field',
              operationType: 'last_value',
              params: {
                sortField: 'time',
                showArrayValues: false,
              },
            } as GenericIndexPatternColumn,
          ]),
          'col2'
        )
      ).toBeFalsy();
    });

    it('SHOULD be sortable when NOT using top-hit agg and source field is date or number', () => {
      expect(
        isSortableByColumn(
          getLayer(getStringBasedOperationColumn(), [
            {
              label: 'Last Value',
              dataType: 'number',
              isBucketed: false,
              sourceField: 'bytes',
              operationType: 'last_value',
              params: {
                sortField: 'time',
                showArrayValues: false,
              },
            } as GenericIndexPatternColumn,
          ]),
          'col2'
        )
      ).toBeTruthy();

      expect(
        isSortableByColumn(
          getLayer(getStringBasedOperationColumn(), [
            {
              label: 'Last Value',
              dataType: 'date',
              isBucketed: false,
              sourceField: 'order_date',
              operationType: 'last_value',
              params: {
                sortField: 'time',
                showArrayValues: false,
              },
            } as GenericIndexPatternColumn,
          ]),
          'col2'
        )
      ).toBeTruthy();
    });
  });

  describe('other bucket defaults', () => {
    it('should default to true if size < 1000 and previous otherBucket is not set', () => {
      const column = {
        label: `Top value of test`,
        dataType: 'string',
        isBucketed: true,
        operationType: 'terms',
        params: {
          orderBy: { type: 'alphabetical' },
          size: 3,
          orderDirection: 'asc',
        },
        sourceField: 'test',
      } as TermsIndexPatternColumn;
      expect(getOtherBucketSwitchDefault(column, 10)).toBeTruthy();
    });

    it('should default to false if size > 1000 and previous otherBucket is not set', () => {
      const column = {
        label: `Top value of test`,
        dataType: 'string',
        isBucketed: true,
        operationType: 'terms',
        params: {
          orderBy: { type: 'alphabetical' },
          size: 3,
          orderDirection: 'asc',
        },
        sourceField: 'test',
      } as TermsIndexPatternColumn;
      expect(getOtherBucketSwitchDefault(column, 1000)).toBeFalsy();
    });

    it('should default to true if size < 1000 and previous otherBucket is set to true', () => {
      const column = {
        label: `Top value of test`,
        dataType: 'string',
        isBucketed: true,
        operationType: 'terms',
        params: {
          orderBy: { type: 'alphabetical' },
          size: 3,
          orderDirection: 'asc',
          otherBucket: true,
        },
        sourceField: 'test',
      } as TermsIndexPatternColumn;
      expect(getOtherBucketSwitchDefault(column, 10)).toBeTruthy();
    });

    it('should default to false if size > 1000 and previous otherBucket is set to true', () => {
      const column = {
        label: `Top value of test`,
        dataType: 'string',
        isBucketed: true,
        operationType: 'terms',
        params: {
          orderBy: { type: 'alphabetical' },
          size: 3,
          orderDirection: 'asc',
          otherBucket: true,
        },
        sourceField: 'test',
      } as TermsIndexPatternColumn;
      expect(getOtherBucketSwitchDefault(column, 1001)).toBeFalsy();
    });

    it('should default to false if size < 1000 and previous otherBucket is set to false', () => {
      const column = {
        label: `Top value of test`,
        dataType: 'string',
        isBucketed: true,
        operationType: 'terms',
        params: {
          orderBy: { type: 'alphabetical' },
          size: 1005,
          orderDirection: 'asc',
          otherBucket: false,
        },
        sourceField: 'test',
      } as TermsIndexPatternColumn;
      expect(getOtherBucketSwitchDefault(column, 6)).toBeFalsy();
    });
  });
});
