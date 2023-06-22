/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiButtonGroup,
  EuiButtonGroupOptionProps,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiToolTip,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { HOST_LIMIT_OPTIONS } from '../../constants';
import { HostLimitOptions } from '../../types';

interface Props {
  limit: HostLimitOptions;
  onChange: (limit: number) => void;
}

export const LimitOptions = ({ limit, onChange }: Props) => {
  return (
    <EuiFlexGroup
      direction="row"
      alignItems="center"
      justifyContent="spaceBetween"
      responsive={false}
      gutterSize="xs"
    >
      <EuiFlexItem grow={false}>
        <EuiText size="xs" textAlign="left">
          <strong>
            <FormattedMessage
              id="xpack.infra.hostsViewPage.hostLimit"
              defaultMessage="Host limit"
            />
          </strong>
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiToolTip
          className="eui-fullWidth"
          delay="regular"
          content={i18n.translate('xpack.infra.hostsViewPage.hostLimit.tooltip', {
            defaultMessage:
              'To ensure faster query performance, there is a limit to the number of hosts returned',
          })}
          anchorClassName="eui-fullWidth"
        >
          <EuiIcon type="iInCircle" size="m" />
        </EuiToolTip>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiButtonGroup
          type="single"
          legend={i18n.translate('xpack.infra.hostsViewPage.tabs.alerts.alertStatusFilter.legend', {
            defaultMessage: 'Filter by',
          })}
          idSelected={buildId(limit)}
          options={options}
          onChange={(_, value: number) => onChange(value)}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

const buildId = (option: number) => `hostLimit_${option}`;
const options: EuiButtonGroupOptionProps[] = HOST_LIMIT_OPTIONS.map((option) => ({
  id: buildId(option),
  label: `${option}`,
  value: option,
  'data-test-subj': `hostsViewLimitSelection${option}button`,
}));
