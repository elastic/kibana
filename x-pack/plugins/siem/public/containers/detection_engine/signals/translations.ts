/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

export const SIGNAL_FETCH_FAILURE = i18n.translate(
  'xpack.siem.containers.detectionEngine.signals.errorFetchingSignalsDescription',
  {
    defaultMessage: 'Failed to query signals',
  }
);

export const PRIVILEGE_FETCH_FAILURE = i18n.translate(
  'xpack.siem.containers.detectionEngine.signals.errorFetchingSignalsDescription',
  {
    defaultMessage: 'Failed to query signals',
  }
);

export const SIGNAL_GET_NAME_FAILURE = i18n.translate(
  'xpack.siem.containers.detectionEngine.signals.errorGetSignalDescription',
  {
    defaultMessage: 'Failed to get signal index name',
  }
);

export const SIGNAL_POST_FAILURE = i18n.translate(
  'xpack.siem.containers.detectionEngine.signals.errorPostSignalDescription',
  {
    defaultMessage: 'Failed to create signal index',
  }
);
