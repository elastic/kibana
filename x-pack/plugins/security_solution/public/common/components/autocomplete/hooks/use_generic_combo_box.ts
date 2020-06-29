/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useEffect, useState, useMemo } from 'react';
import { EuiComboBoxOptionOption } from '@elastic/eui';

interface UseGenericComboBox {
  comboOptions: EuiComboBoxOptionOption[];
  labels: string[];
  selectedComboOptions: EuiComboBoxOptionOption[];
}
export type UseGenericComboBoxReturn = [UseGenericComboBox];
interface UseGericComboBoxProps<T> {
  options: T[];
  selectedOptions: T[];
  getLabel: (value: T) => string;
}

/**
 * Hook for using preparing the eui combo box props
 *
 */
export function useGenericComboBox<T>({
  options,
  selectedOptions,
  getLabel,
}: UseGericComboBoxProps<T>): UseGenericComboBoxReturn {
  const [labels, setLabels] = useState<string[]>([]);
  const [comboOptions, setComboOptions] = useState<EuiComboBoxOptionOption[]>([]);
  const [selectedComboOptions, setSelectedOptions] = useState<EuiComboBoxOptionOption[]>([]);
  const selectedOptionsMemo = useMemo(() => selectedOptions.map(getLabel).sort().join(), [
    selectedOptions,
    getLabel,
  ]);

  useEffect(() => {
    const newLabels = options.map(getLabel);
    const newComboOptions: EuiComboBoxOptionOption[] = newLabels.map((label) => ({ label }));
    const newSelectedComboOptions = selectedOptions
      .filter((option) => {
        return options.indexOf(option) !== -1;
      })
      .map((option) => {
        return newComboOptions[options.indexOf(option)];
      });

    setLabels(newLabels);
    setComboOptions(newComboOptions);
    setSelectedOptions(newSelectedComboOptions);
    // NOTE: Using selectedOptionsMemo, to avoid continuous re-render
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [options, selectedOptionsMemo, getLabel]);

  return [{ comboOptions, labels, selectedComboOptions }];
}
