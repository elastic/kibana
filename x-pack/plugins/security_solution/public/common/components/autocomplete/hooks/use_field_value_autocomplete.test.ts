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
import { getField } from '../../../../../../../../src/plugins/data/common/index_patterns/fields/fields.mocks.ts';
import { OperatorTypeEnum } from '../../../../lists_plugin_deps';

jest.mock('../../../../common/lib/kibana');

describe('useFieldValueAutocomplete', () => {
  const onErrorMock = jest.fn();
  const getValueSuggestionsMock = jest.fn().mockResolvedValue(['value 1', 'value 2']);

  beforeAll(() => {
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
        })
      );
      await waitForNextUpdate();

      expect(result.current).toEqual([false, [], result.current[2]]);
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
        })
      );
      await waitForNextUpdate();

      const expectedResult: UseFieldValueAutocompleteReturn = [false, [], result.current[2]];

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
        })
      );
      await waitForNextUpdate();

      const expectedResult: UseFieldValueAutocompleteReturn = [false, [], result.current[2]];

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
        })
      );
      await waitForNextUpdate();

      const expectedResult: UseFieldValueAutocompleteReturn = [false, [], result.current[2]];

      expect(getValueSuggestionsMock).not.toHaveBeenCalled();
      expect(result.current).toEqual(expectedResult);
    });
  });

  test('returns suggestions of "true" and "false" if field type is boolean', async () => {
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
        })
      );
      await waitForNextUpdate();
      await waitForNextUpdate();

      const expectedResult: UseFieldValueAutocompleteReturn = [
        false,
        ['true', 'false'],
        result.current[2],
      ];

      expect(getValueSuggestionsMock).not.toHaveBeenCalled();
      expect(result.current).toEqual(expectedResult);
    });
  });

  test('returns suggestions', async () => {
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
        })
      );
      await waitForNextUpdate();
      await waitForNextUpdate();

      const expectedResult: UseFieldValueAutocompleteReturn = [
        false,
        ['value 1', 'value 2'],
        result.current[2],
      ];

      expect(getValueSuggestionsMock).toHaveBeenCalledWith({
        field: getField('@tags'),
        indexPattern: stubIndexPatternWithFields,
        query: '',
        signal: new AbortController().signal,
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
        })
      );
      await waitForNextUpdate();
      await waitForNextUpdate();

      result.current[2]({
        fieldSelected: getField('@tags'),
        value: 'hello',
        patterns: stubIndexPatternWithFields,
        signal: new AbortController().signal,
      });

      await waitForNextUpdate();

      const expectedResult: UseFieldValueAutocompleteReturn = [
        false,
        ['value 1', 'value 2'],
        result.current[2],
      ];

      expect(getValueSuggestionsMock).toHaveBeenCalledTimes(2);
      expect(result.current).toEqual(expectedResult);
    });
  });
});
