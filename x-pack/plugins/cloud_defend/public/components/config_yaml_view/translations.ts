/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const enableDriftPrevention = i18n.translate('xpack.cloudDefend.enableDriftPrevention', {
  defaultMessage: 'Enable drift prevention',
});

export const enableDriftPreventionHelp = i18n.translate(
  'xpack.cloudDefend.enableDriftPreventionHelp',
  {
    defaultMessage:
      'Drift prevention can be used to block executables from being created or modified in a container.',
  }
);

export const driftPreventionYaml = i18n.translate('xpack.cloudDefend.driftPreventionYaml', {
  defaultMessage: 'Configuration yaml',
});

export const driftPreventionYamlHelp = i18n.translate('xpack.cloudDefend.driftPreventionYamlHelp', {
  defaultMessage:
    'Configure drift prevention by creating selectors, and responses below. To learn more click <here>',
});
