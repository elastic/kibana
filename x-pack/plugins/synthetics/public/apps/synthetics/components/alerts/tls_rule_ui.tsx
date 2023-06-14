/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useDispatch, useSelector } from 'react-redux';
import React, { useCallback, useEffect } from 'react';
import { RuleTypeParamsExpressionProps } from '@kbn/triggers-actions-ui-plugin/public';
import { EuiCallOut, EuiLoadingSpinner, EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { AlertTlsComponent } from './alert_tls';
import { AlertQueryBar } from './query_bar';
import { getDynamicSettings } from '../../state/settings/api';
import { selectDynamicSettings } from '../../state/settings';
import { TLSParams } from '../../../../../common/runtime_types/alerts/tls';
import { DYNAMIC_SETTINGS_DEFAULTS } from '../../../../../common/constants';

export const TLSRuleComponent: React.FC<{
  ruleParams: RuleTypeParamsExpressionProps<TLSParams>['ruleParams'];
  setRuleParams: RuleTypeParamsExpressionProps<TLSParams>['setRuleParams'];
}> = ({ ruleParams, setRuleParams }) => {
  const dispatch = useDispatch();

  const { settings } = useSelector(selectDynamicSettings);

  useEffect(() => {
    if (typeof settings === 'undefined') {
      dispatch(getDynamicSettings());
    }
  }, [dispatch, settings]);

  const onSearchChange = useCallback(
    (value: string) => {
      setRuleParams('search', value === '' ? undefined : value);
    },
    [setRuleParams]
  );

  return (
    <>
      <AlertMonitorCount count={0} loading={false} />

      <EuiSpacer size="s" />

      <AlertQueryBar query={ruleParams.search || ''} onChange={onSearchChange} />

      <AlertTlsComponent
        ageThreshold={
          ruleParams.certAgeThreshold ??
          settings?.certAgeThreshold ??
          DYNAMIC_SETTINGS_DEFAULTS.certAgeThreshold
        }
        expirationThreshold={
          ruleParams.certExpirationThreshold ??
          settings?.certExpirationThreshold ??
          DYNAMIC_SETTINGS_DEFAULTS.certExpirationThreshold
        }
        setAgeThreshold={(value) => setRuleParams('certAgeThreshold', Number(value))}
        setExpirationThreshold={(value) => setRuleParams('certExpirationThreshold', Number(value))}
      />
    </>
  );
};

export const AlertMonitorCount = ({ count, loading }: { count: number; loading?: boolean }) => {
  return (
    <EuiCallOut
      size="s"
      title={
        <span data-test-subj="alertSnapShotCount">
          <FormattedMessage
            id="xpack.synthetics.alerts.monitorStatus.monitorCallOut.title"
            defaultMessage="This alert will apply to approximately {snapshotCount} monitors."
            values={{ snapshotCount: loading ? '...' : count }}
          />{' '}
          {loading && <EuiLoadingSpinner />}
        </span>
      }
      iconType="iInCircle"
    />
  );
};
