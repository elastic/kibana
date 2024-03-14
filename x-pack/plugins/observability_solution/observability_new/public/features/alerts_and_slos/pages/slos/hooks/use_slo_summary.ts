/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import numeral from '@elastic/numeral';
import { ALL_VALUE, SLOWithSummaryResponse } from '@kbn/slo-schema';
import { IUiSettingsClient } from '@kbn/core-ui-settings-browser';
import {
  StatefulObservabilityRouter,
  useObservabilityRouter,
} from '../../../../../hooks/use_router';
import { useKibana } from '../../../../../hooks/use_kibana';
import { NOT_AVAILABLE_LABEL } from '../../../../../../common/features/alerts_and_slos/i18n';

export const useSloFormattedSummary = (slo: SLOWithSummaryResponse) => {
  const { uiSettings } = useKibana().services;
  const { link } = useObservabilityRouter();

  return getSloFormattedSummary(slo, uiSettings, link);
};

export const getSloFormattedSummary = (
  slo: SLOWithSummaryResponse,
  uiSettings: IUiSettingsClient,
  link: StatefulObservabilityRouter['link']
) => {
  const percentFormat = uiSettings.get('format:percent:defaultPattern');

  const sliValue =
    slo.summary.status === 'NO_DATA'
      ? NOT_AVAILABLE_LABEL
      : numeral(slo.summary.sliValue).format(percentFormat);

  const sloTarget = numeral(slo.objective.target).format(percentFormat);
  const errorBudgetRemaining =
    slo.summary.errorBudget.remaining <= 0
      ? Math.trunc(slo.summary.errorBudget.remaining * 100) / 100
      : slo.summary.errorBudget.remaining;

  const errorBudgetRemainingTitle =
    slo.summary.status === 'NO_DATA'
      ? NOT_AVAILABLE_LABEL
      : numeral(errorBudgetRemaining).format(percentFormat);

  const sloDetailsUrl = link('/slos/{sloId}', {
    path: {
      sloId: slo.id,
    },
    query: {
      instanceId:
        ![slo.groupBy].flat().includes(ALL_VALUE) && slo.instanceId ? slo.instanceId : undefined,
    },
  });

  return {
    sloDetailsUrl,
    sliValue,
    sloTarget,
    errorBudgetRemaining: errorBudgetRemainingTitle,
  };
};

export const useSloFormattedSLIValue = (sliValue?: number): string | null => {
  const { uiSettings } = useKibana().services;
  const percentFormat = uiSettings.get('format:percent:defaultPattern');

  const formattedSLIValue =
    sliValue !== undefined && sliValue !== null ? numeral(sliValue).format(percentFormat) : null;

  return formattedSLIValue;
};
