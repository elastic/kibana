/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { RuleActionParams } from '../types';
import { RuleUrl } from './execution_handler';

export interface InjectActionParamsOpts {
  actionTypeId: string;
  actionParams: RuleActionParams;
  ruleUrl?: RuleUrl;
}

export function injectActionParams({
  actionTypeId,
  actionParams,
  ruleUrl = {},
}: InjectActionParamsOpts) {
  // Inject kibanaFooterLink if action type is email. This is used by the email action type
  // to inject a "View alert in Kibana" with a URL in the email's footer.
  if (actionTypeId === '.email') {
    // path should not include basePathname since it is part of kibanaBaseUrl already
    const path = [ruleUrl.spaceIdSegment ?? '', ruleUrl.relativePath ?? ''].join('');
    return {
      ...actionParams,
      kibanaFooterLink: {
        path,
        text: i18n.translate('xpack.alerting.injectActionParams.email.kibanaFooterLinkText', {
          defaultMessage: 'View rule in Kibana',
        }),
      },
    };
  }

  // Fallback, return action params unchanged
  return actionParams;
}
