/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

export const NO_WRITE_SIGNALS_CALLOUT_TITLE = i18n.translate(
  'xpack.siem.detectionEngine.noWriteSignalsCallOutTitle',
  {
    defaultMessage: 'You cannot change signals states',
  }
);

export const NO_WRITE_SIGNALS_CALLOUT_MSG = i18n.translate(
  'xpack.siem.detectionEngine.noWriteSignalsCallOutMsg',
  {
    defaultMessage:
      'You only have permissions to view signals. If you need to update signal states (open or close signals), contact your Kibana administrator.',
  }
);

export const DISMISS_CALLOUT = i18n.translate(
  'xpack.siem.detectionEngine.dismissNoWriteSignalButton',
  {
    defaultMessage: 'Dismiss',
  }
);
