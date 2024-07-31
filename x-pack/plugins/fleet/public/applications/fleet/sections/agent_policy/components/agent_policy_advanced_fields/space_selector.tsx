/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type EuiComboBoxOptionOption, EuiHealth } from '@elastic/eui';
import { EuiComboBox } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useQuery } from '@tanstack/react-query';
import React, { useMemo } from 'react';

import { API_VERSIONS } from '../../../../../../../common';

import { sendRequestForRq } from '../../../../../../hooks';

export interface SpaceSelectorProps {
  value: string[];
  onChange: (newVal: string[]) => void;
  isDisabled?: boolean;
}

export const SpaceSelector: React.FC<SpaceSelectorProps> = ({ value, onChange, isDisabled }) => {
  // TODO move to useRequest
  const res = useQuery(['fleet-get-spaces'], async () => {
    return sendRequestForRq({
      method: 'get',
      path: '/internal/fleet/agent_policies_spaces',
      version: API_VERSIONS.internal.v1,
    });
  });

  const renderOption = React.useCallback(
    (option: any, searchValue: string, contentClassName: string) => (
      <EuiHealth color={option.color}>
        <span className={contentClassName}>{option.label}</span>
      </EuiHealth>
    ),
    []
  );

  const options: Array<EuiComboBoxOptionOption<string>> = useMemo(() => {
    return (
      res.data?.items.map((item: any) => ({
        label: item.name,
        key: item.id,
        ...item,
      })) ?? []
    );
  }, [res.data]);

  const selectedOptions: Array<EuiComboBoxOptionOption<string>> = useMemo(() => {
    // loading
    if (res.isInitialLoading) {
      return [];
    }
    return value.map((v) => {
      const existingOption = options.find((opt) => opt.key === v);

      return existingOption
        ? existingOption
        : {
            label: v,
            key: v,
          };
    });
  }, [options, value, res.isInitialLoading]);

  return (
    <EuiComboBox
      data-test-subj={'spaceSelectorComboBox'}
      aria-label={i18n.translate('xpack.fleet.agentPolicies.spaceSelectorLabel', {
        defaultMessage: 'Spaces',
      })}
      fullWidth
      options={options}
      renderOption={renderOption}
      selectedOptions={selectedOptions}
      isDisabled={res.isInitialLoading || isDisabled}
      isClearable={false}
      onChange={(newOptions) => {
        onChange(newOptions.map(({ key }) => key as string));
      }}
    />
  );
};
