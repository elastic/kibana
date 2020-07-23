/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { EuiComboBoxOptionOption, EuiComboBox } from '@elastic/eui';

import { IFieldType } from '../../../../../../../src/plugins/data/common';
import { useFindLists, ListSchema } from '../../../lists_plugin_deps';
import { useKibana } from '../../../common/lib/kibana';
import { getGenericComboBoxProps, paramIsValid } from './helpers';

interface AutocompleteFieldListsProps {
  placeholder: string;
  selectedField: IFieldType | undefined;
  selectedValue: string | undefined;
  isLoading: boolean;
  isDisabled: boolean;
  isClearable: boolean;
  isRequired?: boolean;
  onChange: (arg: ListSchema) => void;
}

export const AutocompleteFieldListsComponent: React.FC<AutocompleteFieldListsProps> = ({
  placeholder,
  selectedField,
  selectedValue,
  isLoading = false,
  isDisabled = false,
  isClearable = false,
  isRequired = false,
  onChange,
}): JSX.Element => {
  const [touched, setIsTouched] = useState(false);
  const { http } = useKibana().services;
  const [lists, setLists] = useState<ListSchema[]>([]);
  const { loading, result, start } = useFindLists();
  const getLabel = useCallback(({ name }) => name, []);

  const optionsMemo = useMemo(() => {
    if (
      selectedField != null &&
      selectedField.esTypes != null &&
      selectedField.esTypes.length > 0
    ) {
      return lists.filter(({ type }) => selectedField.esTypes?.includes(type));
    } else {
      return [];
    }
  }, [lists, selectedField]);
  const selectedOptionsMemo = useMemo(() => {
    if (selectedValue != null) {
      const list = lists.filter(({ id }) => id === selectedValue);
      return list ?? [];
    } else {
      return [];
    }
  }, [selectedValue, lists]);
  const { comboOptions, labels, selectedComboOptions } = useMemo(
    () =>
      getGenericComboBoxProps<ListSchema>({
        options: optionsMemo,
        selectedOptions: selectedOptionsMemo,
        getLabel,
      }),
    [optionsMemo, selectedOptionsMemo, getLabel]
  );

  const handleValuesChange = useCallback(
    (newOptions: EuiComboBoxOptionOption[]) => {
      const [newValue] = newOptions.map(({ label }) => optionsMemo[labels.indexOf(label)]);
      onChange(newValue ?? '');
    },
    [labels, optionsMemo, onChange]
  );

  const setIsTouchedValue = useCallback(() => setIsTouched(true), [setIsTouched]);

  useEffect(() => {
    if (result != null) {
      setLists(result.data);
    }
  }, [result]);

  useEffect(() => {
    if (selectedField != null) {
      start({
        http,
        pageIndex: 1,
        pageSize: 500,
      });
    }
  }, [selectedField, start, http]);

  const isValid = useMemo(
    (): boolean => paramIsValid(selectedValue, selectedField, isRequired, touched),
    [selectedField, selectedValue, isRequired, touched]
  );

  const isLoadingState = useMemo((): boolean => isLoading || loading, [isLoading, loading]);

  return (
    <EuiComboBox
      placeholder={placeholder}
      isDisabled={isDisabled}
      isLoading={isLoadingState}
      isClearable={isClearable}
      options={comboOptions}
      selectedOptions={selectedComboOptions}
      onChange={handleValuesChange}
      isInvalid={!isValid}
      onFocus={setIsTouchedValue}
      singleSelection={{ asPlainText: true }}
      sortMatchesBy="startsWith"
      data-test-subj="valuesAutocompleteComboBox listsComboxBox"
      fullWidth
      async
    />
  );
};

AutocompleteFieldListsComponent.displayName = 'AutocompleteFieldList';
