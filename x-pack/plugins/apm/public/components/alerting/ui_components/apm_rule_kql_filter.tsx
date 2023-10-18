/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import React from 'react';
import { EuiSwitch } from '@elastic/eui';
import { EuiFormRow } from '@elastic/eui';
import { EuiSpacer } from '@elastic/eui';
import { EuiSwitchEvent } from '@elastic/eui';
import { TransactionDurationRuleParams } from '../rule_types/transaction_duration_rule_type';
import { ErrorRateRuleParams } from '../rule_types/transaction_error_rate_rule_type';
import { ErrorCountRuleParams } from '../rule_types/error_count_rule_type';
import { ApmRuleUnifiedSearchBar } from './apm_rule_unified_search_bar';

interface Props {
  ruleParams:
    | TransactionDurationRuleParams
    | ErrorRateRuleParams
    | ErrorCountRuleParams;
  setRuleParams: (key: string, value: any) => void;
  onToggleKqlFilter: (e: EuiSwitchEvent) => void;
}

export function ApmRuleKqlFilter({
  ruleParams,
  setRuleParams,
  onToggleKqlFilter,
}: Props) {
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

  const kqlFilter = ruleParams.useKqlFilter ? (
    <>
      <EuiFormRow
        label={i18n.translate('xpack.apm.rules.ruleFlyout.filterLabel', {
          defaultMessage: 'Filter',
        })}
        helpText={i18n.translate('xpack.apm.rules.ruleFlyout.filterHelpText', {
          defaultMessage:
            'Use a KQL expression to limit the scope of your alert trigger.',
        })}
        fullWidth
        display="rowCompressed"
      >
        <ApmRuleUnifiedSearchBar
          ruleParams={ruleParams}
          setRuleParams={setRuleParams}
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
