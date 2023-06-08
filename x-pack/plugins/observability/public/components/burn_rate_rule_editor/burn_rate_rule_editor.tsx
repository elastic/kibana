/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import numeral from '@elastic/numeral';
import { EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import { RuleTypeParamsExpressionProps } from '@kbn/triggers-actions-ui-plugin/public';
import React, { useEffect, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { SLOResponse } from '@kbn/slo-schema';

import { toDuration, toMinutes } from '../../utils/slo/duration';
import { useFetchSloDetails } from '../../hooks/slo/use_fetch_slo_details';
import { BurnRateRuleParams, Duration, DurationUnit } from '../../typings';
import { SloSelector } from './slo_selector';
import { BurnRate } from './burn_rate';
import { LongWindowDuration } from './long_window_duration';
import { ValidationBurnRateRuleResult } from './validation';

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
  const [longWindowDuration, setLongWindowDuration] = useState<Duration>({
    value: ruleParams?.longWindow?.value ?? 1,
    unit: (ruleParams?.longWindow?.unit as DurationUnit) ?? 'h',
  });
  const [shortWindowDuration, setShortWindowDuration] = useState<Duration>({
    value: ruleParams?.shortWindow?.value ?? 5,
    unit: (ruleParams?.shortWindow?.unit as DurationUnit) ?? 'm',
  });
  const [burnRate, setBurnRate] = useState<number>(ruleParams?.burnRateThreshold ?? 1);
  const [maxBurnRate, setMaxBurnRate] = useState<number>(ruleParams?.maxBurnRateThreshold ?? 1);

  useEffect(() => {
    const hasInitialSlo = !loadingInitialSlo && initialSlo !== undefined;
    setSelectedSlo(hasInitialSlo ? initialSlo : undefined);
  }, [loadingInitialSlo, initialSlo, setRuleParams]);

  const onLongWindowDurationChange = (duration: Duration) => {
    setLongWindowDuration(duration);
    const longWindowDurationInMinutes = toMinutes(duration);
    const shortWindowDurationValue = Math.floor(longWindowDurationInMinutes / 12);
    setShortWindowDuration({ value: shortWindowDurationValue, unit: 'm' });
  };

  const onBurnRateChange = (value: number) => {
    setBurnRate(value);
    setRuleParams('burnRateThreshold', value);
  };

  const onSelectedSlo = (slo: SLOResponse | undefined) => {
    setSelectedSlo(slo);
    setRuleParams('sloId', slo?.id);
  };

  useEffect(() => {
    if (selectedSlo) {
      const sloDurationInMinutes = toMinutes(toDuration(selectedSlo.timeWindow.duration));
      const longWindowDurationInMinutes = toMinutes(longWindowDuration);
      const maxBurnRateThreshold = Math.floor(sloDurationInMinutes / longWindowDurationInMinutes);
      setMaxBurnRate(maxBurnRateThreshold);
    }
  }, [longWindowDuration, selectedSlo]);

  useEffect(() => {
    setRuleParams('longWindow', longWindowDuration);
    setRuleParams('shortWindow', shortWindowDuration);
  }, [shortWindowDuration, longWindowDuration, setRuleParams]);

  useEffect(() => {
    setRuleParams('burnRateThreshold', burnRate);
    setRuleParams('maxBurnRateThreshold', maxBurnRate);
  }, [burnRate, maxBurnRate, setRuleParams]);

  const computeErrorBudgetExhaustionInHours = () => {
    if (selectedSlo && longWindowDuration?.value > 0 && burnRate >= 1) {
      return numeral(
        longWindowDuration.value /
          ((burnRate * toMinutes(longWindowDuration)) /
            toMinutes(toDuration(selectedSlo.timeWindow.duration)))
      ).format('0a');
    }

    return 'N/A';
  };

  return (
    <EuiFlexGroup direction="column">
      <EuiFlexGroup direction="row">
        <EuiFlexItem>
          <SloSelector initialSlo={selectedSlo} onSelected={onSelectedSlo} errors={errors.sloId} />
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiFlexGroup direction="row">
        <EuiFlexItem>
          <LongWindowDuration
            initialDuration={longWindowDuration}
            shortWindowDuration={shortWindowDuration}
            onChange={onLongWindowDurationChange}
            errors={errors.longWindow}
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <BurnRate
            initialBurnRate={burnRate}
            maxBurnRate={maxBurnRate}
            onChange={onBurnRateChange}
            errors={errors.burnRateThreshold}
            helpText={getErrorBudgetExhaustionText(computeErrorBudgetExhaustionInHours())}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="m" />
    </EuiFlexGroup>
  );
}

const getErrorBudgetExhaustionText = (formattedHours: string) =>
  i18n.translate('xpack.observability.slo.rules.errorBudgetExhaustion.text', {
    defaultMessage: '{formatedHours} hours until error budget exhaustion.',
    values: {
      formatedHours: formattedHours,
    },
  });
