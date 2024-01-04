/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import numeral from '@elastic/numeral';
import { ALL_VALUE, SLOWithSummaryResponse } from '@kbn/slo-schema';
import { paths } from '../../../../common/locators/paths';
import { useKibana } from '../../../utils/kibana_react';
import { NOT_AVAILABLE_LABEL } from '../../../../common/i18n';

export const useSloFormattedSummary = (slo: SLOWithSummaryResponse) => {
  const {
    http: { basePath },
  } = useKibana().services;
  const { uiSettings } = useKibana().services;
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

  const sloDetailsUrl = basePath.prepend(
    paths.observability.sloDetails(
      slo.id,
      slo.groupBy !== ALL_VALUE && slo.instanceId ? slo.instanceId : undefined
    )
  );

  return {
    sloDetailsUrl,
    sliValue,
    sloTarget,
    errorBudgetRemaining: errorBudgetRemainingTitle,
  };
};
