/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { find } from 'lodash';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { i18n } from '@kbn/i18n';
import type { EuiComboBoxOptionOption } from '@elastic/eui';
import { EuiFormRow, EuiComboBox, EuiTextColor, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import styled from 'styled-components';

import type { FieldHook } from '../../shared_imports';
import { VALIDATION_TYPES } from '../../shared_imports';
import type { PackSavedObject } from '../../packs/types';

const TextTruncate = styled.div`
  overflow: hidden;
  text-overflow: ellipsis;
`;

interface Props {
  field: FieldHook<string[]>;
  euiFieldProps?: {
    packsData?: PackSavedObject[];
  };
  idAria?: string;
  [key: string]: unknown;
}

interface PackOption {
  id: string;
  name: string;
  description?: string;
}

export const PacksComboBoxField = ({ field, euiFieldProps = {}, idAria, ...rest }: Props) => {
  const [selectedOptions, setSelectedOptions] = useState<
    Array<EuiComboBoxOptionOption<PackOption>>
  >([]);
  // Errors for the comboBox value (the "array")
  const errorMessageField = field.getErrorsMessages();

  // Errors for comboBox option added (the array "item")
  const errorMessageArrayItem = field.getErrorsMessages({
    validationType: VALIDATION_TYPES.ARRAY_ITEM,
  });

  const isInvalid = field.errors.length
    ? errorMessageField !== null || errorMessageArrayItem !== null
    : false;

  // Concatenate error messages.
  const errorMessage =
    errorMessageField && errorMessageArrayItem
      ? `${errorMessageField}, ${errorMessageArrayItem}`
      : errorMessageField
      ? errorMessageField
      : errorMessageArrayItem;

  const handlePackChange = useCallback(
    (newSelectedOptions) => {
      if (!newSelectedOptions.length) {
        setSelectedOptions(newSelectedOptions);
        field.setValue([]);

        return;
      }

      setSelectedOptions(newSelectedOptions);
      field.setValue([newSelectedOptions[0].value?.id]);
    },
    [field]
  );

  const packOptions = useMemo<Array<EuiComboBoxOptionOption<PackOption>>>(
    () =>
      euiFieldProps?.packsData?.map((packSO) => ({
        label: packSO.attributes.name ?? '',
        value: {
          id: packSO.id,
          name: packSO.attributes.name,
          description: packSO.attributes.description,
        },
      })) ?? [],
    [euiFieldProps?.packsData]
  );

  const onSearchComboChange = useCallback(
    (value: string) => {
      if (value !== undefined) {
        field.clearErrors(VALIDATION_TYPES.ARRAY_ITEM);
      }
    },
    [field]
  );

  const renderOption = useCallback(
    ({ value }) => (
      <EuiFlexGroup
        gutterSize="none"
        direction="column"
        alignItems="flexStart"
        justifyContent="flexStart"
      >
        <EuiFlexItem>
          <strong>{value.name}</strong>
        </EuiFlexItem>
        <EuiFlexItem>
          <TextTruncate>
            <EuiTextColor color="subdued">{value.description}</EuiTextColor>
          </TextTruncate>
        </EuiFlexItem>
      </EuiFlexGroup>
    ),
    []
  );

  useEffect(() => {
    if (field.value.length) {
      const packOption = find(packOptions, ['value.id', field.value[0]]);

      if (packOption) {
        setSelectedOptions([packOption]);
      }
    }
  }, [field.value, packOptions]);

  return (
    <EuiFormRow
      label={field.label}
      labelAppend={field.labelAppend}
      helpText={typeof field.helpText === 'function' ? field.helpText() : field.helpText}
      error={errorMessage}
      isInvalid={isInvalid}
      fullWidth
      // eslint-disable-next-line react-perf/jsx-no-new-array-as-prop
      describedByIds={idAria ? [idAria] : undefined}
      {...rest}
    >
      <EuiComboBox<PackOption>
        placeholder={i18n.translate('xpack.osquery.packs.dropdown.searchFieldPlaceholder', {
          defaultMessage: `Search for a pack to run`,
        })}
        selectedOptions={selectedOptions}
        onChange={handlePackChange}
        onSearchChange={onSearchComboChange}
        data-test-subj="select-live-pack"
        fullWidth
        // eslint-disable-next-line react-perf/jsx-no-new-object-as-prop
        singleSelection={{ asPlainText: true }}
        renderOption={renderOption}
        options={packOptions}
        rowHeight={60}
        {...euiFieldProps}
      />
    </EuiFormRow>
  );
};
