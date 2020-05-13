/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

export const certificateFormTranslations = {
  ageInputAriaLabel: i18n.translate(
    'xpack.uptime.sourceConfiguration.ageLimitThresholdInput.ariaLabel',
    {
      defaultMessage:
        'An input that controls the maximum number of days for which a TLS certificate may be valid before Kibana will show a warning.',
    }
  ),
  expirationInputAriaLabel: i18n.translate(
    'xpack.uptime.sourceConfiguration.certificateExpirationThresholdInput.ariaLabel',
    {
      defaultMessage:
        'An input that controls the minimum number of days remaining for TLS certificate expiration before Kibana will show a warning.',
    }
  ),
};
