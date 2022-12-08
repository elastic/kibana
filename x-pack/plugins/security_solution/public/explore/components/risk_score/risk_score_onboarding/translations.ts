/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '../../../../private/var/tmp/_bazel_stephmilovic/f2692a3f20a774c59f0da1de1e889609/execroot/kibana/bazel-out/darwin_arm64-fastbuild/bin/packages/kbn-i18n';

export const TECHNICAL_PREVIEW = i18n.translate(
  'xpack.securitySolution.riskScore.technicalPreviewLabel',
  {
    defaultMessage: 'Technical Preview',
  }
);

export const HOST_WARNING_TITLE = i18n.translate(
  'xpack.securitySolution.riskScore.hostsDashboardWarningPanelTitle',
  {
    defaultMessage: 'No host risk score data available to display',
  }
);

export const USER_WARNING_TITLE = i18n.translate(
  'xpack.securitySolution.riskScore.usersDashboardWarningPanelTitle',
  {
    defaultMessage: 'No user risk score data available to display',
  }
);

export const HOST_WARNING_BODY = i18n.translate(
  'xpack.securitySolution.riskScore.hostsDashboardWarningPanelBody',
  {
    defaultMessage: `We haven't detected any host risk score data from the hosts in your environment. The data might need an hour to be generated after enabling the module.`,
  }
);

export const USER_WARNING_BODY = i18n.translate(
  'xpack.securitySolution.riskScore.usersDashboardWarningPanelBody',
  {
    defaultMessage: `We haven't detected any user risk score data from the users in your environment. The data might need an hour to be generated after enabling the module.`,
  }
);

export const RESTART_TOOLTIP = i18n.translate(
  'xpack.securitySolution.riskScore.usersDashboardRestartTooltip',
  {
    defaultMessage:
      'The risk score calculation might take a while to run. However, by pressing restart, you can force it to run immediately.',
  }
);
