/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useCallback, useMemo, useState, useEffect } from 'react';
import { useController } from 'react-hook-form';
import { EuiComboBox, EuiFormRow } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useAgentPolicies } from '../../../agent_policies';
import type { ShardsFormReturn } from './shards_form';

interface ShardsPolicyFieldComponent {
  index: number;
  isLastItem: boolean;
  control: ShardsFormReturn['control'];
  euiFieldProps?: Record<string, unknown>;
  hideLabel?: boolean;
}

const ShardsPolicyFieldComponent = ({
  index,
  control,
  isLastItem,
  hideLabel,
}: ShardsPolicyFieldComponent) => {
  const { data: { agentPoliciesById } = {} } = useAgentPolicies();

  const {
    field: { onChange, value },
    fieldState: { error },
  } = useController({
    control,
    name: `shardsArray.${index}.policy`,
    rules: !isLastItem
      ? {
          required: {
            message: i18n.translate(
              'xpack.osquery.pack.form.shardsPolicyFieldMissingErrorMessage',
              {
                defaultMessage: 'Policy is a required field',
              }
            ),
            value: true,
          },
        }
      : {},
  });

  const hasError = useMemo(() => !!error?.message, [error?.message]);

  const options = useMemo(
    () =>
      Object.entries(agentPoliciesById ?? {}).map(([agentPolicyId, agentPolicy]) => ({
        key: agentPolicyId,
        label: agentPolicy.name,
      })),
    [agentPoliciesById]
  );

  const [selectedOptions, setSelected] = useState<Array<{ label: string; value: string }>>([]);
  const handleChange = useCallback(
    (newSelectedOptions) => {
      setSelected(newSelectedOptions);
      onChange(newSelectedOptions[0]?.label ?? '');
    },
    [onChange]
  );

  useEffect(() => {
    setSelected([{ label: value, value }]);
  }, [value]);

  const onCreateOption = useCallback(
    (searchValue: string) => {
      const normalizedSearchValue = searchValue.trim().toLowerCase();

      if (!normalizedSearchValue) {
        return;
      }

      const newOption = {
        label: searchValue,
      };

      handleChange([newOption]);
    },
    [handleChange]
  );

  const singleSelectionConfig = useMemo(() => ({ asPlainText: true }), []);

  return (
    <EuiFormRow
      label={
        hideLabel
          ? ''
          : i18n.translate('xpack.osquery.pack.form.policyFieldLabel', {
              defaultMessage: 'Policy',
            })
      }
      error={error?.message}
      isInvalid={hasError}
      fullWidth
    >
      <EuiComboBox
        fullWidth
        singleSelection={singleSelectionConfig}
        isInvalid={hasError}
        options={options}
        selectedOptions={selectedOptions}
        onCreateOption={onCreateOption}
        customOptionText="Add {searchValue} as a filter to the list"
        onChange={handleChange}
        data-test-subj="shards-field-policy"
        rowHeight={32}
        isClearable
      />
    </EuiFormRow>
  );
};

export const ShardsPolicyField = React.memo(ShardsPolicyFieldComponent);
