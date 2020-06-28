/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useEffect, useState } from 'react';
import { debounce } from 'lodash';

import { IFieldType, IIndexPattern } from '../../../../../../../src/plugins/data/common';
import { OperatorTypeEnum } from '../../../lists_plugin_deps';
import { useKibana } from '../../../common/lib/kibana';

export type UseAutocompleteReturn = [boolean, string[]];
interface UseExceptionListProps {
  field: IFieldType;
  operator: OperatorTypeEnum;
  values: string | string[] | number;
  indexPattern: IIndexPattern;
}
/**
 * Hook for using the field autocomplete service
 *
 */
export const useFieldValueAutocomplete = ({
  field,
  operator,
  values,
  indexPattern,
}: UseExceptionListProps): UseAutocompleteReturn => {
  const { services } = useKibana();

  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const updateSuggestions = debounce(
    async ({
      fieldSelected,
      value,
      patterns,
    }: {
      fieldSelected: IFieldType;
      value: string | string[] | number;
      patterns: IIndexPattern;
    }) => {
      if (!fieldSelected || isLoading) {
        return;
      }

      setIsLoading(true);

      if (fieldSelected.type === 'boolean') {
        setIsLoading(false);
        setSuggestions(['true', 'false']);
        return;
      }

      const newSuggestions = await services.data.autocomplete.getValueSuggestions({
        indexPattern: patterns,
        field: fieldSelected,
        query: `${value ?? ''}`,
      });

      setIsLoading(false);
      setSuggestions(newSuggestions);
    },
    500
  );

  useEffect(
    () => {
      if (operator !== OperatorTypeEnum.EXISTS) {
        updateSuggestions({ fieldSelected: field, value: values, patterns: indexPattern });
      }
    }, // eslint-disable-next-line react-hooks/exhaustive-deps
    [field, operator, values, indexPattern]
  );

  return [isLoading, suggestions];
};
