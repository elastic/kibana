/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useEffect, useState, useRef } from 'react';
import debounce from 'lodash/debounce';
import { IFieldType, IIndexPattern } from '../../../../../../../../src/plugins/data/common';
import { useKibana } from '../../../../common/lib/kibana';
import { OperatorTypeEnum } from '../../../../lists_plugin_deps';

type Func = (args: {
  fieldSelected: IFieldType | undefined;
  value: string | string[] | undefined;
  patterns: IIndexPattern | undefined;
}) => void;

export type UseFieldValueAutocompleteReturn = [boolean, string[], Func | null];

export interface UseFieldValueAutocompleteProps {
  selectedField: IFieldType | undefined;
  operatorType: OperatorTypeEnum;
  fieldValue: string | string[] | undefined;
  indexPattern: IIndexPattern | undefined;
}
/**
 * Hook for using the field value autocomplete service
 *
 */
export const useFieldValueAutocomplete = ({
  selectedField,
  operatorType,
  fieldValue,
  indexPattern,
}: UseFieldValueAutocompleteProps): UseFieldValueAutocompleteReturn => {
  const { services } = useKibana();
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const updateSuggestions = useRef<Func | null>(null);

  useEffect(() => {
    let isSubscribed = true;
    const abortCtrl = new AbortController();

    const fetchSuggestions = debounce(
      async ({
        fieldSelected,
        value,
        patterns,
      }: {
        fieldSelected: IFieldType | undefined;
        value: string | string[] | undefined;
        patterns: IIndexPattern | undefined;
      }) => {
        const inputValue: string | string[] = value ?? '';
        const userSuggestion: string = Array.isArray(inputValue)
          ? inputValue[inputValue.length - 1] ?? ''
          : inputValue;

        try {
          if (isSubscribed) {
            if (fieldSelected == null || patterns == null) {
              return;
            }

            setIsLoading(true);

            // Fields of type boolean should only display two options
            if (fieldSelected.type === 'boolean') {
              setIsLoading(false);
              setSuggestions(['true', 'false']);
              return;
            }

            const newSuggestions = await services.data.autocomplete.getValueSuggestions({
              indexPattern: patterns,
              field: fieldSelected,
              query: userSuggestion.trim(),
              signal: abortCtrl.signal,
            });

            setIsLoading(false);
            setSuggestions([...newSuggestions]);
          }
        } catch (error) {
          if (isSubscribed) {
            setSuggestions([]);
            setIsLoading(false);
          }
        }
      },
      500
    );

    if (operatorType !== OperatorTypeEnum.EXISTS) {
      fetchSuggestions({
        fieldSelected: selectedField,
        value: fieldValue,
        patterns: indexPattern,
      });
    }

    updateSuggestions.current = fetchSuggestions;

    return (): void => {
      isSubscribed = false;
      abortCtrl.abort();
    };
  }, [services.data.autocomplete, selectedField, operatorType, fieldValue, indexPattern]);

  return [isLoading, suggestions, updateSuggestions.current];
};
