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
import { useFetchSloDetails } from '../../hooks/use_fetch_slo_details';
import { BurnRateRuleParams, WindowSchema } from '../../typings';
import { SloSelector } from './slo_selector';
import { ValidationBurnRateRuleResult } from './validation';
import { createNewWindow, Windows } from './windows';
import { BURN_RATE_DEFAULTS } from './constants';
import { AlertTimeTable } from './alert_time_table';
import { getGroupKeysProse } from '../../utils/slo/groupings';

type Props = Pick<
  RuleTypeParamsExpressionProps<BurnRateRuleParams>,
  'ruleParams' | 'setRuleParams'
> &
  ValidationBurnRateRuleResult;

export function BurnRateRuleEditor(props: Props) {
  const { setRuleParams, ruleParams, errors } = props;
  const { data: initialSlo } = useFetchSloDetails({
    sloId: ruleParams?.sloId,
  });

  const [selectedSlo, setSelectedSlo] = useState<SLOResponse | undefined>(undefined);
  const [windowDefs, setWindowDefs] = useState<WindowSchema[]>(ruleParams?.windows || []);

  useEffect(() => {
    setSelectedSlo(initialSlo);
    setWindowDefs((previous) => {
      if (previous.length > 0) {
        return previous;
      }
      return createDefaultWindows(initialSlo);
    });
  }, [initialSlo]);

  const onSelectedSlo = (slo: SLOResponse | undefined) => {
    setSelectedSlo(slo);
    setWindowDefs(() => {
      return createDefaultWindows(slo);
    });
    setRuleParams('sloId', slo?.id);
  };

  useEffect(() => {
    setRuleParams('windows', windowDefs);
  }, [windowDefs, setRuleParams]);

  return (
    <>
      <EuiTitle size="xs">
        <h5>
          {i18n.translate('xpack.slo.burnRateRuleEditor.h5.chooseASLOToMonitorLabel', {
            defaultMessage: 'Choose a SLO to monitor',
          })}
        </h5>
      </EuiTitle>
      <EuiSpacer size="s" />
      <SloSelector initialSlo={selectedSlo} onSelected={onSelectedSlo} errors={errors.sloId} />
      {selectedSlo?.groupBy && ![selectedSlo.groupBy].flat().includes(ALL_VALUE) && (
        <>
          <EuiSpacer size="l" />
          <EuiCallOut
            color="warning"
            size="s"
            title={i18n.translate('xpack.slo.rules.groupByMessage', {
              defaultMessage:
                'The SLO you selected has been created with a group-by on {groupByField}. This rule will monitor and generate an alert for every instance found in the group-by field.',
              values: { groupByField: getGroupKeysProse(selectedSlo.groupBy) },
            })}
          />
        </>
      )}
      <EuiSpacer size="l" />
      {selectedSlo && (
        <>
          <Windows
            slo={selectedSlo}
            windows={windowDefs}
            onChange={setWindowDefs}
            errors={errors.windows}
          />
          <AlertTimeTable slo={selectedSlo} windows={windowDefs} />
        </>
      )}
    </>
  );
}

function createDefaultWindows(slo: SLOResponse | undefined) {
  const burnRateDefaults = slo ? BURN_RATE_DEFAULTS[slo.timeWindow.duration] : [];
  return burnRateDefaults.map((partialWindow) => createNewWindow(slo, partialWindow));
}
