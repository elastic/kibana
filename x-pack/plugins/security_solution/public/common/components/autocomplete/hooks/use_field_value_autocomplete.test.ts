/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { act, renderHook } from '@testing-library/react-hooks';

import {
  UseFieldValueAutocompleteProps,
  UseFieldValueAutocompleteReturn,
  useFieldValueAutocomplete,
} from './use_field_value_autocomplete';
import { useKibana } from '../../../../common/lib/kibana';
import { stubIndexPatternWithFields } from '../../../../../../../../src/plugins/data/common/index_patterns/index_pattern.stub';
import { getField } from '../../../../../../../../src/plugins/data/common/index_patterns/fields/fields.mocks';
import { OperatorTypeEnum } from '../../../../lists_plugin_deps';

jest.mock('../../../../common/lib/kibana');

describe('useFieldValueAutocomplete', () => {
  const onErrorMock = jest.fn();
  const getValueSuggestionsMock = jest.fn().mockResolvedValue(['value 1', 'value 2']);

  beforeEach(() => {
    (useKibana as jest.Mock).mockReturnValue({
      services: {
        data: {
          autocomplete: {
            getValueSuggestions: getValueSuggestionsMock,
          },
        },
      },
    });
  });

  afterEach(() => {
    onErrorMock.mockClear();
    getValueSuggestionsMock.mockClear();
  });

  test('initializes hook', async () => {
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<
        UseFieldValueAutocompleteProps,
        UseFieldValueAutocompleteReturn
      >(() =>
        useFieldValueAutocomplete({
          selectedField: undefined,
          operatorType: OperatorTypeEnum.MATCH,
          fieldValue: '',
          indexPattern: undefined,
          query: '',
        })
      );
      await waitForNextUpdate();

      expect(result.current).toEqual([false, true, [], result.current[3]]);
    });
  });

  test('does not call autocomplete service if "operatorType" is "exists"', async () => {
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<
        UseFieldValueAutocompleteProps,
        UseFieldValueAutocompleteReturn
      >(() =>
        useFieldValueAutocomplete({
          selectedField: getField('machine.os'),
          operatorType: OperatorTypeEnum.EXISTS,
          fieldValue: '',
          indexPattern: stubIndexPatternWithFields,
          query: '',
        })
      );
      await waitForNextUpdate();

      const expectedResult: UseFieldValueAutocompleteReturn = [false, true, [], result.current[3]];

      expect(getValueSuggestionsMock).not.toHaveBeenCalled();
      expect(result.current).toEqual(expectedResult);
    });
  });

  test('does not call autocomplete service if "selectedField" is undefined', async () => {
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<
        UseFieldValueAutocompleteProps,
        UseFieldValueAutocompleteReturn
      >(() =>
        useFieldValueAutocomplete({
          selectedField: undefined,
          operatorType: OperatorTypeEnum.EXISTS,
          fieldValue: '',
          indexPattern: stubIndexPatternWithFields,
          query: '',
        })
      );
      await waitForNextUpdate();

      const expectedResult: UseFieldValueAutocompleteReturn = [false, true, [], result.current[3]];

      expect(getValueSuggestionsMock).not.toHaveBeenCalled();
      expect(result.current).toEqual(expectedResult);
    });
  });

  test('does not call autocomplete service if "indexPattern" is undefined', async () => {
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<
        UseFieldValueAutocompleteProps,
        UseFieldValueAutocompleteReturn
      >(() =>
        useFieldValueAutocomplete({
          selectedField: getField('machine.os'),
          operatorType: OperatorTypeEnum.EXISTS,
          fieldValue: '',
          indexPattern: undefined,
          query: '',
        })
      );
      await waitForNextUpdate();

      const expectedResult: UseFieldValueAutocompleteReturn = [false, true, [], result.current[3]];

      expect(getValueSuggestionsMock).not.toHaveBeenCalled();
      expect(result.current).toEqual(expectedResult);
    });
  });

  test('it uses full path name for nested fields to fetch suggestions', async () => {
    const suggestionsMock = jest.fn().mockResolvedValue([]);

    (useKibana as jest.Mock).mockReturnValue({
      services: {
        data: {
          autocomplete: {
            getValueSuggestions: suggestionsMock,
          },
        },
      },
    });
    await act(async () => {
      const signal = new AbortController().signal;
      const { waitForNextUpdate } = renderHook<
        UseFieldValueAutocompleteProps,
        UseFieldValueAutocompleteReturn
      >(() =>
        useFieldValueAutocomplete({
          selectedField: { ...getField('nestedField.child'), name: 'child' },
          operatorType: OperatorTypeEnum.MATCH,
          fieldValue: '',
          indexPattern: stubIndexPatternWithFields,
          query: '',
        })
      );
      // Note: initial `waitForNextUpdate` is hook initialization
      await waitForNextUpdate();
      await waitForNextUpdate();

      expect(suggestionsMock).toHaveBeenCalledWith({
        field: { ...getField('nestedField.child'), name: 'nestedField.child' },
        indexPattern: {
          fields: [
            {
              aggregatable: true,
              esTypes: ['integer'],
              filterable: true,
              name: 'response',
              searchable: true,
              type: 'number',
            },
          ],
          id: '1234',
          title: 'logstash-*',
        },
        query: '',
        signal,
      });
    });
  });

  test('returns "isSuggestingValues" of false if field type is boolean', async () => {
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<
        UseFieldValueAutocompleteProps,
        UseFieldValueAutocompleteReturn
      >(() =>
        useFieldValueAutocomplete({
          selectedField: getField('ssl'),
          operatorType: OperatorTypeEnum.MATCH,
          fieldValue: '',
          indexPattern: stubIndexPatternWithFields,
          query: '',
        })
      );
      // Note: initial `waitForNextUpdate` is hook initialization
      await waitForNextUpdate();
      await waitForNextUpdate();

      const expectedResult: UseFieldValueAutocompleteReturn = [false, false, [], result.current[3]];

      expect(getValueSuggestionsMock).not.toHaveBeenCalled();
      expect(result.current).toEqual(expectedResult);
    });
  });

  test('returns "isSuggestingValues" of false to note that autocomplete service is not in use if no autocomplete suggestions available', async () => {
    const suggestionsMock = jest.fn().mockResolvedValue([]);

    (useKibana as jest.Mock).mockReturnValue({
      services: {
        data: {
          autocomplete: {
            getValueSuggestions: suggestionsMock,
          },
        },
      },
    });
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<
        UseFieldValueAutocompleteProps,
        UseFieldValueAutocompleteReturn
      >(() =>
        useFieldValueAutocomplete({
          selectedField: getField('bytes'),
          operatorType: OperatorTypeEnum.MATCH,
          fieldValue: '',
          indexPattern: stubIndexPatternWithFields,
          query: '',
        })
      );
      // Note: initial `waitForNextUpdate` is hook initialization
      await waitForNextUpdate();
      await waitForNextUpdate();

      const expectedResult: UseFieldValueAutocompleteReturn = [false, false, [], result.current[3]];

      expect(suggestionsMock).toHaveBeenCalled();
      expect(result.current).toEqual(expectedResult);
    });
  });

  test('returns suggestions', async () => {
    await act(async () => {
      const signal = new AbortController().signal;
      const { result, waitForNextUpdate } = renderHook<
        UseFieldValueAutocompleteProps,
        UseFieldValueAutocompleteReturn
      >(() =>
        useFieldValueAutocomplete({
          selectedField: getField('@tags'),
          operatorType: OperatorTypeEnum.MATCH,
          fieldValue: '',
          indexPattern: stubIndexPatternWithFields,
          query: '',
        })
      );
      // Note: initial `waitForNextUpdate` is hook initialization
      await waitForNextUpdate();
      await waitForNextUpdate();

      const expectedResult: UseFieldValueAutocompleteReturn = [
        false,
        true,
        ['value 1', 'value 2'],
        result.current[3],
      ];

      expect(getValueSuggestionsMock).toHaveBeenCalledWith({
        field: getField('@tags'),
        indexPattern: stubIndexPatternWithFields,
        query: '',
        signal,
      });
      expect(result.current).toEqual(expectedResult);
    });
  });

  test('returns new suggestions on subsequent calls', async () => {
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<
        UseFieldValueAutocompleteProps,
        UseFieldValueAutocompleteReturn
      >(() =>
        useFieldValueAutocomplete({
          selectedField: getField('@tags'),
          operatorType: OperatorTypeEnum.MATCH,
          fieldValue: '',
          indexPattern: stubIndexPatternWithFields,
          query: '',
        })
      );
      // Note: initial `waitForNextUpdate` is hook initialization
      await waitForNextUpdate();
      await waitForNextUpdate();

      expect(result.current[3]).not.toBeNull();

      // Added check for typescripts sake, if null,
      // would not reach below logic as test would stop above
      if (result.current[3] != null) {
        result.current[3]({
          fieldSelected: getField('@tags'),
          value: 'hello',
          patterns: stubIndexPatternWithFields,
          searchQuery: '',
        });
      }

      await waitForNextUpdate();

      const expectedResult: UseFieldValueAutocompleteReturn = [
        false,
        true,
        ['value 1', 'value 2'],
        result.current[3],
      ];

      expect(getValueSuggestionsMock).toHaveBeenCalledTimes(2);
      expect(result.current).toEqual(expectedResult);
    });
  });
});
