/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { RuleActionParams } from '../types';
import { RuleUrl } from './action_scheduler';

export interface InjectActionParamsOpts {
  actionTypeId: string;
  actionParams: RuleActionParams;
  ruleUrl?: RuleUrl;
  ruleName?: string;
}

export function injectActionParams({
  actionTypeId,
  actionParams,
  ruleName,
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

  if (actionTypeId === '.pagerduty') {
    /**
     * TODO: Remove and use connector adapters
     */
    const path = ruleUrl?.absoluteUrl ?? '';

    if (path.length === 0) {
      return actionParams;
    }

    const links = Array.isArray(actionParams.links) ? actionParams.links : [];

    return {
      ...actionParams,
      links: [
        {
          href: path,
          text: i18n.translate('xpack.alerting.injectActionParams.pagerduty.kibanaLinkText', {
            defaultMessage: 'Elastic Rule "{ruleName}"',
            values: { ruleName: ruleName ?? 'Unknown' },
          }),
        },
        ...links,
      ],
    };
  }

  // Fallback, return action params unchanged
  return actionParams;
}
