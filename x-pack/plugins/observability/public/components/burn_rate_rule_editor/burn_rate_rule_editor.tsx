/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RuleTypeParamsExpressionProps } from '@kbn/triggers-actions-ui-plugin/public';
import React, { useEffect, useState } from 'react';
import { ALL_VALUE, SLOResponse } from '@kbn/slo-schema';

import { EuiCallOut, EuiSpacer, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useFetchSloDetails } from '../../hooks/slo/use_fetch_slo_details';
import { BurnRateRuleParams, WindowSchema } from '../../typings';
import { SloSelector } from './slo_selector';
import { ValidationBurnRateRuleResult } from './validation';
import { createNewWindow, Windows, calculateMaxBurnRateThreshold } from './windows';
import {
  ALERT_ACTION,
  HIGH_PRIORITY_ACTION,
  LOW_PRIORITY_ACTION,
  MEDIUM_PRIORITY_ACTION,
} from '../../../common/constants';

type Props = Pick<
  RuleTypeParamsExpressionProps<BurnRateRuleParams>,
  'ruleParams' | 'setRuleParams'
> &
  ValidationBurnRateRuleResult;

export function BurnRateRuleEditor(props: Props) {
  const { setRuleParams, ruleParams, errors } = props;
  const { isLoading: loadingInitialSlo, slo: initialSlo } = useFetchSloDetails({
    sloId: ruleParams?.sloId,
  });

  const [selectedSlo, setSelectedSlo] = useState<SLOResponse | undefined>(undefined);

  useEffect(() => {
    const hasInitialSlo = !loadingInitialSlo && initialSlo !== undefined;
    setSelectedSlo(hasInitialSlo ? initialSlo : undefined);
  }, [loadingInitialSlo, initialSlo, setRuleParams]);

  const onSelectedSlo = (slo: SLOResponse | undefined) => {
    setSelectedSlo(slo);
    setRuleParams('sloId', slo?.id);
  };

  const [windowDefs, setWindowDefs] = useState<WindowSchema[]>(
    ruleParams?.windows || [
      createNewWindow(selectedSlo, {
        burnRateThreshold: 14.4,
        longWindow: { value: 1, unit: 'h' },
        shortWindow: { value: 5, unit: 'm' },
        actionGroup: ALERT_ACTION.id,
      }),
      createNewWindow(selectedSlo, {
        burnRateThreshold: 6,
        longWindow: { value: 6, unit: 'h' },
        shortWindow: { value: 30, unit: 'm' },
        actionGroup: HIGH_PRIORITY_ACTION.id,
      }),
      createNewWindow(selectedSlo, {
        burnRateThreshold: 3,
        longWindow: { value: 24, unit: 'h' },
        shortWindow: { value: 120, unit: 'm' },
        actionGroup: MEDIUM_PRIORITY_ACTION.id,
      }),
      createNewWindow(selectedSlo, {
        burnRateThreshold: 1,
        longWindow: { value: 72, unit: 'h' },
        shortWindow: { value: 360, unit: 'm' },
        actionGroup: LOW_PRIORITY_ACTION.id,
      }),
    ]
  );

  // When the SLO changes, recalculate the max burn rates
  useEffect(() => {
    setWindowDefs((previous) =>
      previous.map((windowDef) => {
        return {
          ...windowDef,
          maxBurnRateThreshold: calculateMaxBurnRateThreshold(windowDef.longWindow, selectedSlo),
        };
      })
    );
  }, [selectedSlo]);

  useEffect(() => {
    setRuleParams('windows', windowDefs);
  }, [windowDefs, setRuleParams]);

  return (
    <>
      <EuiTitle size="xs">
        <h5>Choose a SLO to monitor</h5>
      </EuiTitle>
      <EuiSpacer size="s" />
      <SloSelector initialSlo={selectedSlo} onSelected={onSelectedSlo} errors={errors.sloId} />
      {selectedSlo?.groupBy && selectedSlo.groupBy !== ALL_VALUE && (
        <>
          <EuiSpacer size="l" />
          <EuiCallOut
            color="warning"
            size="s"
            title={i18n.translate('xpack.observability.slo.rules.groupByMessage', {
              defaultMessage:
                'The SLO you selected has been created with a partition on "{groupByField}". This rule will monitor and generate an alert for every instance found in the partition field.',
              values: { groupByField: selectedSlo.groupBy },
            })}
          />
        </>
      )}
      <EuiSpacer size="l" />
      <EuiTitle size="xs">
        <h5>Define multiple burn rate windows</h5>
      </EuiTitle>
      <EuiSpacer size="s" />
      <Windows
        slo={selectedSlo}
        windows={windowDefs}
        onChange={setWindowDefs}
        errors={errors.windows}
      />
      <EuiSpacer size="m" />
    </>
  );
}
