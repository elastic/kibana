/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const RULE_AD_HOC_ERROR = i18n.translate(
  'xpack.securitySolution.detectionEngine.queryAdHocRun.rulePreviewError',
  {
    defaultMessage: 'Failed to run rule',
  }
);

export const QUERY_AD_HOC_RUN_LABEL = i18n.translate(
  'xpack.securitySolution.detectionEngine.queryAdHocRun.queryAdHocRunLabel',
  {
    defaultMessage: 'Select an ad hoc execution timeframe',
  }
);

export const QUERY_AD_HOC_INVOCATION_COUNT_WARNING_TITLE = i18n.translate(
  'xpack.securitySolution.detectionEngine.queryAdHocRun.queryAdHocRunInvocationCountWarningTitle',
  {
    defaultMessage: 'Ad hoc rule execution timeframe might cause timeout',
  }
);

export const QUERY_AD_HOC_INVOCATION_COUNT_WARNING_MESSAGE = i18n.translate(
  'xpack.securitySolution.detectionEngine.queryAdHocRun.queryAdHocRunInvocationCountWarningMessage',
  {
    defaultMessage: `The timeframe and rule interval that you selected for running this rule might cause timeout or take long time to execute. Try to decrease the timeframe and/or increase the interval if the execution has timed out.`,
  }
);

export const QUERY_GRAPH_COUNT = i18n.translate(
  'xpack.securitySolution.detectionEngine.queryAdHocRun.queryGraphCountLabel',
  {
    defaultMessage: 'Count',
  }
);

export const QUERY_GRAPH_HITS_TITLE = i18n.translate(
  'xpack.securitySolution.detectionEngine.queryAdHocRun.queryAdHocRunTitle',
  {
    defaultMessage: 'Alerts',
  }
);

export const QUERY_AD_HOC_RUN_ERROR = i18n.translate(
  'xpack.securitySolution.detectionEngine.queryAdHocRun.queryGraphAdHocRunFetchError',
  {
    defaultMessage: 'Error fetching ad hoc execution',
  }
);

export const RULE_AD_HOC_RUN_FLYOUT_TITLE = i18n.translate(
  'xpack.securitySolution.detectionEngine.adHocRun.flyoutTitle',
  {
    defaultMessage: 'Rule ad hoc run',
  }
);

export const RULE_AD_HOC_RUN_FLYOUT_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.detectionEngine.adHocRun.flyoutDescription',
  {
    defaultMessage:
      'Run the rule on an ad hoc defined time range and cover gaps in your detection.',
  }
);

export const AD_HOC_RUN_HISTOGRAM_DISCLAIMER = i18n.translate(
  'xpack.securitySolution.detectionEngine.adHocRun.histogramDisclaimer',
  {
    defaultMessage:
      'Note: Alerts with multiple event.category values will be counted more than once.',
  }
);

export const ML_AD_HOC_RUN_HISTOGRAM_DISCLAIMER = i18n.translate(
  'xpack.securitySolution.detectionEngine.adHocRun.mlHistogramDisclaimer',
  {
    defaultMessage: 'Note: Alerts with multiple host.name values will be counted more than once.',
  }
);
