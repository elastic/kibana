/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useCallback, useEffect, useState } from 'react';
import { EuiComboBoxOptionOption } from '@elastic/eui';
import { uniq } from 'lodash';

interface UseGenericComboBox {
  options: EuiComboBoxOptionOption[];
  labels: string[];
  selectedOptions: EuiComboBoxOptionOption[];
}
export type UseAutocompleteReturn = [UseGenericComboBox];
interface UseGericComboBoxProps {
  suggestions: string[];
  value: string | string[] | number;
  type: 'phrase' | 'phrases' | 'exists';
  getLabel: (a: unknown) => string;
}

/**
 * Hook for using the field autocomplete service
 *
 */
export const useGenericComboBox = ({
  suggestions,
  value,
  type,
  getLabel,
}: UseGericComboBoxProps): UseAutocompleteReturn => {
  const [options, setOptions] = useState<EuiComboBoxOptionOption[]>([]);
  const [labels, setLabels] = useState<string[]>([]);
  const [selectedComboOptions, setSelectedOptions] = useState<EuiComboBoxOptionOption[]>([]);

  const getOptions = useCallback(
    (
      val: string | string[] | number,
      newSuggestions: string[]
    ): {
      newOptions: string[];
      newSelectedOptions: string[];
    } => {
      switch (type) {
        case 'phrase':
          const valueAsStr = String(val);
          const phraseOptions = val ? uniq([valueAsStr, ...newSuggestions]) : newSuggestions;
          return { newOptions: phraseOptions, newSelectedOptions: val ? [valueAsStr] : [] };
        case 'phrases':
          if (Array.isArray(val)) {
            const phrasesOptions = val ? uniq([...val, ...newSuggestions]) : newSuggestions;
            return { newOptions: phrasesOptions, newSelectedOptions: val ?? [] };
          } else {
            return { newOptions: [], newSelectedOptions: [] };
          }
        default:
          return { newOptions: [], newSelectedOptions: [] };
      }
    },
    [type]
  );

  useEffect(() => {
    const { newOptions, newSelectedOptions } =
      type != null ? getOptions(value, suggestions) : suggestions;
    const newLabels = newOptions.map(getLabel);
    const euiOptions: EuiComboBoxOptionOption[] = newLabels.map((label) => ({ label }));
    const selectedEuiOptions = newSelectedOptions
      .filter((option) => {
        return newOptions.indexOf(option) !== -1;
      })
      .map((option) => {
        return euiOptions[newOptions.indexOf(option)];
      });

    setLabels(newLabels);
    setOptions(newLabels.map((label) => ({ label })));
    setSelectedOptions(selectedEuiOptions);
  }, [getOptions, suggestions, value, getLabel]);

  return [{ options, labels, selectedOptions: selectedComboOptions }];
};
