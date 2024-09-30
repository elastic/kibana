/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonGroup, EuiFlexGroup, EuiFlexItem, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { SloTabId } from '../../../pages/slo_details/components/slo_details';
import { BurnRateOption } from './burn_rates';
interface Props {
  burnRateOption: BurnRateOption;
  setBurnRateOption: (option: BurnRateOption) => void;
  burnRateOptions: BurnRateOption[];
  selectedTabId: SloTabId;
}
export function BurnRateHeader({
  burnRateOption,
  burnRateOptions,
  setBurnRateOption,
  selectedTabId,
}: Props) {
  const onBurnRateOptionChange = (optionId: string) => {
    const selected = burnRateOptions.find((opt) => opt.id === optionId) ?? burnRateOptions[0];
    setBurnRateOption(selected);
  };
  return (
    <EuiFlexGroup justifyContent="spaceBetween">
      <EuiFlexItem grow={false}>
        <EuiTitle size="xs">
          <h2>
            {i18n.translate('xpack.slo.burnRate.title', {
              defaultMessage: 'Burn rate',
            })}
          </h2>
        </EuiTitle>
      </EuiFlexItem>
      {selectedTabId !== 'history' && (
        <EuiFlexItem grow={false}>
          <EuiButtonGroup
            legend={i18n.translate('xpack.slo.burnRate.timeRangeBtnLegend', {
              defaultMessage: 'Select the time range',
            })}
            options={burnRateOptions.map((opt) => ({
              id: opt.id,
              label: opt.label,
              'aria-label': opt.ariaLabel,
            }))}
            idSelected={burnRateOption.id}
            onChange={onBurnRateOptionChange}
            buttonSize="compressed"
          />
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
}
