/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { RuleActionParams } from '../types';

export interface InjectActionParamsOpts {
  ruleId: string;
  spaceId: string | undefined;
  actionTypeId: string;
  actionParams: RuleActionParams;
}

export function injectActionParams({
  ruleId,
  spaceId,
  actionTypeId,
  actionParams,
}: InjectActionParamsOpts) {
  // Inject kibanaFooterLink if action type is email. This is used by the email action type
  // to inject a "View alert in Kibana" with a URL in the email's footer.
  if (actionTypeId === '.email') {
    const spacePrefix =
      spaceId && spaceId.length > 0 && spaceId !== 'default' ? `/s/${spaceId}` : '';
    return {
      ...actionParams,
      kibanaFooterLink: {
        path: `${spacePrefix}/app/management/insightsAndAlerting/triggersActions/rule/${ruleId}`,
        text: i18n.translate('xpack.alerting.injectActionParams.email.kibanaFooterLinkText', {
          defaultMessage: 'View rule in Kibana',
        }),
      },
    };
  }

  // Fallback, return action params unchanged
  return actionParams;
}
