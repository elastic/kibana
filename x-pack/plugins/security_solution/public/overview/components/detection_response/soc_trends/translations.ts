/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const SOC_TRENDS = i18n.translate('xpack.securitySolution.detectionResponse.socTrends', {
  defaultMessage: 'SOC Trends',
});

export const CASES_MTTR_STAT = i18n.translate('xpack.securitySolution.detectionResponse.mttr', {
  defaultMessage: 'Avg. case response time',
});

export const CASES_MTTR_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.detectionResponse.mttrDescription',
  {
    defaultMessage: 'The average duration (from creation to closure) for your current cases',
  }
);

export const NO_TIME_CHANGE = i18n.translate(
  'xpack.securitySolution.detectionResponse.noTimeChange',
  {
    defaultMessage: 'Your case resolution time is unchanged',
  }
);

export const NO_CASE_DATA = i18n.translate('xpack.securitySolution.detectionResponse.noCaseData', {
  defaultMessage: 'There is no case data to compare',
});

export const NO_CASE_DATA_COMPARE = i18n.translate(
  'xpack.securitySolution.detectionResponse.noCaseDataCompare',
  {
    defaultMessage: 'There is no case data to compare from the compare time range',
  }
);

export const NO_CASE_DATA_CURRENT = i18n.translate(
  'xpack.securitySolution.detectionResponse.noCaseDataCurrent',
  {
    defaultMessage: 'There is no case data to compare from the current time range',
  }
);

export const TIME_DIFFERENCE = ({
  upOrDown,
  percentageChange,
  time,
}: {
  upOrDown: string;
  percentageChange: string;
  time: string;
}) =>
  i18n.translate('xpack.securitySolution.detectionResponse.timeDifference', {
    defaultMessage: `Your case resolution time is {upOrDown} by {percentageChange} from {time}`,
    values: { upOrDown, percentageChange, time },
  });
