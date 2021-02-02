/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { AlertActionParams } from '../types';

export interface InjectActionParamsOpts {
  alertId: string;
  actionTypeId: string;
  actionParams: AlertActionParams;
}

export function injectActionParams({
  alertId,
  actionTypeId,
  actionParams,
}: InjectActionParamsOpts) {
  // Inject kibanaFooterLink if action type is email. This is used by the email action type
  // to inject a "View alert in Kibana" with a URL in the email's footer.
  if (actionTypeId === '.email') {
    return {
      ...actionParams,
      kibanaFooterLink: {
        path: `/app/management/insightsAndAlerting/triggersActions/alert/${alertId}`,
        text: i18n.translate('xpack.alerts.injectActionParams.email.kibanaFooterLinkText', {
          defaultMessage: 'View alert in Kibana',
        }),
      },
    };
  }

  // Fallback, return action params unchanged
  return actionParams;
}
