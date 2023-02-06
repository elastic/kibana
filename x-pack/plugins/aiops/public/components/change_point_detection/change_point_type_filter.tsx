/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type FC, useCallback, useMemo } from 'react';
import {
  EuiComboBox,
  type EuiComboBoxOptionOption,
  type EuiComboBoxOptionsListProps,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiIcon,
  EuiToolTip,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { isDefined } from '@kbn/ml-is-defined';
import { type ChangePointType } from './change_point_detection_context';

export type ChangePointUIValue = ChangePointType | undefined;

interface ChangePointTypeFilterProps {
  value: ChangePointType[] | undefined;
  onChange: (changePointType: ChangePointType[] | undefined) => void;
}

const changePointTypes: Array<{ value: ChangePointType; description: string }> = [
  {
    value: 'dip',
    description: i18n.translate('xpack.aiops.changePointDetection.dipDescription', {
      defaultMessage: 'a significant dip occurs at this change point',
    }),
  },
  {
    value: 'spike',
    description: i18n.translate('xpack.aiops.changePointDetection.spikeDescription', {
      defaultMessage: 'a significant spike occurs at this point',
    }),
  },
  {
    value: 'distribution_change',
    description: i18n.translate('xpack.aiops.changePointDetection.distributionChangeDescription', {
      defaultMessage: 'the overall distribution of the values has changed significantly',
    }),
  },
  {
    value: 'step_change',
    description: i18n.translate('xpack.aiops.changePointDetection.stepChangeDescription', {
      defaultMessage:
        'the change indicates a statistically significant step up or down in value distribution',
    }),
  },
  {
    value: 'trend_change',
    description: i18n.translate('xpack.aiops.changePointDetection.trendChangeDescription', {
      defaultMessage: 'there is an overall trend change occurring at this point',
    }),
  },
];

interface FilterOption {
  value: ChangePointUIValue;
  label: string;
  description: string;
}

export const ChangePointTypeFilter: FC<ChangePointTypeFilterProps> = ({ value, onChange }) => {
  const options = useMemo<Array<EuiComboBoxOptionOption<ChangePointUIValue>>>(() => {
    return [{ value: undefined, description: '' }, ...changePointTypes].map((v) => ({
      value: v.value,
      label:
        v.value ??
        i18n.translate('xpack.aiops.changePointDetection.selectAllChangePoints', {
          defaultMessage: 'Select all',
        }),
      description: v.description,
    }));
  }, []);

  const selection: Array<EuiComboBoxOptionOption<ChangePointUIValue>> = !value
    ? [options[0]]
    : options.filter((v) => value?.includes(v.value!));

  const onChangeCallback = useCallback(
    (selectedOptions: Array<EuiComboBoxOptionOption<ChangePointUIValue>>) => {
      if (
        selectedOptions.length === 0 ||
        selectedOptions[selectedOptions.length - 1].value === undefined
      ) {
        onChange(undefined);
        return;
      }

      onChange(selectedOptions.map((v) => v.value as ChangePointType).filter(isDefined));
    },
    [onChange]
  );

  const renderOption = ((option: FilterOption) => {
    const { label, description } = option;

    if (!description) {
      return <>{label}</>;
    }
    return (
      <EuiToolTip position="left" content={description}>
        <EuiFlexGroup gutterSize={'s'} alignItems={'center'}>
          <EuiFlexItem grow={false}>
            <EuiIcon type="iInCircle" color={'primary'} />
          </EuiFlexItem>
          <EuiFlexItem>{label}</EuiFlexItem>
        </EuiFlexGroup>
      </EuiToolTip>
    );
  }) as unknown as EuiComboBoxOptionsListProps<ChangePointUIValue>['renderOption'];

  return (
    <EuiFormRow
      label={i18n.translate('xpack.aiops.changePointDetection.changePointTypeLabel', {
        defaultMessage: 'Change point type',
      })}
      display={'columnCompressed'}
      fullWidth
    >
      <EuiComboBox<ChangePointType | undefined>
        options={options}
        selectedOptions={selection}
        onChange={onChangeCallback}
        isClearable
        data-test-subj="aiopsChangePointTypeFilter"
        renderOption={renderOption}
      />
    </EuiFormRow>
  );
};
