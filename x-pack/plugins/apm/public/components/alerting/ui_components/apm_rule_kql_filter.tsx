/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import React, { useCallback } from 'react';
import { debounce } from 'lodash';
import { EuiSwitch } from '@elastic/eui';
import { EuiFormRow } from '@elastic/eui';
import { EuiSpacer } from '@elastic/eui';
import { RuleFlyoutKueryBar } from '@kbn/observability-plugin/public';
import { useApmDataView } from '../../../hooks/use_apm_data_view';
import { TransactionDurationRuleParams } from '../rule_types/transaction_duration_rule_type';
import { ErrorRateRuleParams } from '../rule_types/transaction_error_rate_rule_type';
import { ErrorCountRuleParams } from '../rule_types/error_count_rule_type';

interface Props {
  ruleParams:
    | TransactionDurationRuleParams
    | ErrorRateRuleParams
    | ErrorCountRuleParams;
  setRuleParams: (key: string, value: any) => void;
  onToggleKqlFilter: any;
}

export function ApmRuleKqlFilter({
  ruleParams,
  setRuleParams,
  onToggleKqlFilter,
}: Props) {
  const FILTER_TYPING_DEBOUNCE_MS = 500;

  const { dataView: derivedIndexPattern } = useApmDataView();

  const onFilterChange = useCallback(
    (filter: string) => {
      setRuleParams('kqlFilter', filter);
    },
    [setRuleParams]
  );

  /* eslint-disable-next-line react-hooks/exhaustive-deps */
  const debouncedOnFilterChange = useCallback(
    debounce(onFilterChange, FILTER_TYPING_DEBOUNCE_MS),
    [onFilterChange]
  );

  const placeHolder = i18n.translate(
    'xpack.apm.rule.kqlSearchFieldPlaceholder',
    {
      defaultMessage: 'Search for APM data… (e.g. service.name: service-1)',
    }
  );

  const kqlFilterToggle = (
    <>
      <EuiSwitch
        label={i18n.translate(
          'xpack.apm.rules.transactionDuration.kqlFilterToggle',
          {
            defaultMessage: 'Use KQL Filter',
          }
        )}
        checked={ruleParams.useKqlFilter ?? false}
        onChange={onToggleKqlFilter}
      />
      <EuiSpacer size={'m'} />
    </>
  );

  const kqlFilter =
    ruleParams.useKqlFilter && derivedIndexPattern ? (
      <>
        <EuiFormRow
          label={i18n.translate('xpack.apm.rules.ruleFlyout.filterLabel', {
            defaultMessage: 'Filter (Technical Preview)',
          })}
          helpText={i18n.translate(
            'xpack.apm.rules.ruleFlyout.filterHelpText',
            {
              defaultMessage:
                'Use a KQL expression to limit the scope of your alert trigger.',
            }
          )}
          fullWidth
          display="rowCompressed"
        >
          <RuleFlyoutKueryBar
            placeholder={placeHolder}
            derivedIndexPattern={derivedIndexPattern}
            onChange={debouncedOnFilterChange}
            onSubmit={onFilterChange}
            value={ruleParams.kqlFilter}
          />
        </EuiFormRow>
        <EuiSpacer size={'m'} />
      </>
    ) : null;

  return (
    <>
      {kqlFilterToggle}
      {kqlFilter}
    </>
  );
}
