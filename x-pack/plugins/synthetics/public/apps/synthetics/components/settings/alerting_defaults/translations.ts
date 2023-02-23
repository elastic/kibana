/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const alertFormI18n = {
  inputPlaceHolder: i18n.translate(
    'xpack.synthetics.sourceConfiguration.alertDefaultForm.selectConnector',
    {
      defaultMessage: 'Please select one or more connectors',
    }
  ),
  emailPlaceHolder: i18n.translate(
    'xpack.synthetics.sourceConfiguration.alertDefaultForm.emailConnectorPlaceHolder',
    {
      defaultMessage: 'To: Email for email connector',
    }
  ),
};
