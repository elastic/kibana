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

import { useController } from 'react-hook-form';
import type { PackSavedObject } from '../../packs/types';

const TextTruncate = styled.div`
  overflow: hidden;
  text-overflow: ellipsis;
`;

interface PackComboBoxFieldProps {
  fieldProps?: {
    packsData?: PackSavedObject[];
  };
  idAria?: string;
  queryType: string;
}

interface PackOption {
  id: string;
  name: string;
  description?: string;
}

export const PacksComboBoxField = ({
  queryType,
  fieldProps = {},
  idAria,
  ...rest
}: PackComboBoxFieldProps) => {
  const {
    field: { value, onChange },
    fieldState,
  } = useController({
    name: 'packId',
    rules: {
      required: {
        message: i18n.translate(
          'xpack.osquery.pack.queryFlyoutForm.osqueryPackMissingErrorMessage',
          {
            defaultMessage: 'Pack is a required field',
          }
        ),
        value: queryType === 'pack',
      },
    },
    defaultValue: [],
  });
  const error = fieldState.error?.message;
  const [selectedOptions, setSelectedOptions] = useState<
    Array<EuiComboBoxOptionOption<PackOption>>
  >([]);

  const handlePackChange = useCallback(
    (newSelectedOptions) => {
      if (!newSelectedOptions.length) {
        setSelectedOptions(newSelectedOptions);
        onChange([]);

        return;
      }

      setSelectedOptions(newSelectedOptions);
      onChange([newSelectedOptions[0].value?.id]);
    },
    [onChange]
  );

  const packOptions = useMemo<Array<EuiComboBoxOptionOption<PackOption>>>(
    () =>
      fieldProps?.packsData?.map((packSO) => ({
        label: packSO.attributes.name ?? '',
        value: {
          id: packSO.id,
          name: packSO.attributes.name,
          description: packSO.attributes.description,
        },
      })) ?? [],
    [fieldProps?.packsData]
  );

  const renderOption = useCallback(
    ({ value: option }) => (
      <EuiFlexGroup
        gutterSize="none"
        direction="column"
        alignItems="flexStart"
        justifyContent="flexStart"
      >
        <EuiFlexItem>
          <strong>{option?.name}</strong>
        </EuiFlexItem>
        <EuiFlexItem>
          <TextTruncate>
            <EuiTextColor color="subdued">{option?.description}</EuiTextColor>
          </TextTruncate>
        </EuiFlexItem>
      </EuiFlexGroup>
    ),
    []
  );

  useEffect(() => {
    if (value?.length) {
      const packOption = find(packOptions, ['value.id', value[0]]);

      if (packOption) {
        setSelectedOptions([packOption]);
      }
    }
  }, [value, packOptions]);

  return (
    <EuiFormRow
      label={i18n.translate('xpack.osquery.liveQuery.queryForm.packQueryTypeLabel', {
        defaultMessage: `Pack`,
      })}
      error={error}
      isInvalid={!!error}
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
        data-test-subj="select-live-pack"
        fullWidth
        // eslint-disable-next-line react-perf/jsx-no-new-object-as-prop
        singleSelection={{ asPlainText: true }}
        renderOption={renderOption}
        options={packOptions}
        rowHeight={60}
        {...fieldProps}
      />
    </EuiFormRow>
  );
};
