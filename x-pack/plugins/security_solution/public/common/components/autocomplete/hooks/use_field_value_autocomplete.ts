/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useEffect, useState, useRef } from 'react';
import { debounce } from 'lodash';

import { IFieldType, IIndexPattern } from '../../../../../../../../src/plugins/data/common';
import { useKibana } from '../../../../common/lib/kibana';
import { OperatorType } from '../types';

export type UseFieldValueAutocompleteReturn = [
  boolean,
  string[],
  (args: {
    fieldSelected: IFieldType | null;
    value: string | string[] | undefined;
    patterns: IIndexPattern | null;
    signal: AbortSignal;
  }) => void
];

export interface UseFieldValueAutocompleteProps {
  selectedField: IFieldType | null;
  operatorType: OperatorType;
  fieldValue: string | string[] | undefined;
  indexPattern: IIndexPattern | null;
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
  const updateSuggestions = useRef(
    debounce(
      async ({
        fieldSelected,
        value,
        patterns,
        signal,
      }: {
        fieldSelected: IFieldType | null;
        value: string | string[] | undefined;
        patterns: IIndexPattern | null;
        signal: AbortSignal;
      }) => {
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
          query: `${value ?? ''}`,
          signal,
        });

        setIsLoading(false);
        setSuggestions(newSuggestions);
      },
      500
    )
  );

  useEffect(() => {
    const abortCtrl = new AbortController();

    if (operatorType !== OperatorType.EXISTS) {
      updateSuggestions.current({
        fieldSelected: selectedField,
        value: fieldValue,
        patterns: indexPattern,
        signal: abortCtrl.signal,
      });
    }

    return (): void => {
      abortCtrl.abort();
    };
  }, [updateSuggestions, selectedField, operatorType, fieldValue, indexPattern]);

  return [isLoading, suggestions, updateSuggestions.current];
};
