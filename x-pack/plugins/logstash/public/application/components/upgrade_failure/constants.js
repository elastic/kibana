/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

export const UPGRADE_FAILURE = {
  TITLE: {
    IS_MANUAL_UPGRADE: i18n.translate('xpack.logstash.upgradeFailedTitle', {
      defaultMessage: 'Upgrade failed',
    }),
    NOT_MANUAL_UPGRADE: i18n.translate('xpack.logstash.notManualUpgradeTitle', {
      defaultMessage: 'Time for an upgrade!',
    }),
  },
  MESSAGE: {
    IS_NEW_PIPELINE: i18n.translate('xpack.logstash.newPipelineMessage', {
      defaultMessage: 'Before you can add a pipeline, we need to upgrade your configuration.',
    }),
    NOT_NEW_PIPELINE: i18n.translate('xpack.logstash.notNewPipelineMessage', {
      defaultMessage: 'Before you can edit this pipeline, we need to upgrade your configuration.',
    }),
  },
  UPGRADE_BUTTON_TEXT: {
    IS_MANUAL_UPGRADE: i18n.translate('xpack.logstash.manualUpgradeButtonLabel', {
      defaultMessage: 'Try again',
    }),
    NOT_MANUAL_UPGRADE: i18n.translate('xpack.logstash.notManualUpgradeButtonLabel', {
      defaultMessage: 'Upgrade',
    }),
  },
};
