/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart } from 'kibana/public';
import type { FrameDatasourceAPI } from '../../../../types';
import type { CountIndexPatternColumn } from '../index';
import type { TermsIndexPatternColumn } from './types';
import type { GenericIndexPatternColumn } from '../../../indexpattern';
import { createMockedIndexPattern } from '../../../mocks';
import {
  getDisallowedTermsMessage,
  getMultiTermsScriptedFieldErrorMessage,
  isSortableByColumn,
} from './helpers';
import { ReferenceBasedIndexPatternColumn } from '../column_types';
import { MULTI_KEY_VISUAL_SEPARATOR } from './constants';

const indexPattern = createMockedIndexPattern();

const coreMock = {
  uiSettings: {
    get: () => undefined,
  },
  http: {
    post: jest.fn(() =>
      Promise.resolve({
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
      })
    ),
  },
} as unknown as CoreStart;

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
      coreMock,
      {
        query: { language: 'kuery', query: 'a: b' },
        filters: [],
        dateRange: {
          fromDate: '2020',
          toDate: '2021',
        },
      } as unknown as FrameDatasourceAPI,
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
      } as unknown as FrameDatasourceAPI,
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
      coreMock,
      {
        query: { language: 'kuery', query: 'a: b' },
        filters: [],
        dateRange: {
          fromDate: '2020',
          toDate: '2021',
        },
      } as unknown as FrameDatasourceAPI,
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
      } as unknown as FrameDatasourceAPI,
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

    it('SHOULD be sortable when NOT using top-hit agg', () => {
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
    });
  });
});
