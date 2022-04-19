/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Observable } from 'rxjs';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import React from 'react';
import type { CoreTheme } from '@kbn/core/public';
import { EuiLink, EuiSpacer, EuiText } from '@elastic/eui';
import { RedirectAppLinks, toMountPoint } from '@kbn/kibana-react-plugin/public';
import type { Rule } from '@kbn/triggers-actions-ui-plugin/public';
import { ActionConnector } from '../../state/alerts/alerts';
import { kibanaService } from '../../state/kibana_service';
import { getUrlForAlert } from './common';

export const simpleAlertEnabled = (
  defaultActions: ActionConnector[],
  theme$: Observable<CoreTheme>,
  rule: Rule
) => {
  const alertUrl = getUrlForAlert(rule.id, kibanaService.core.http.basePath.get());

  return {
    title: i18n.translate('xpack.uptime.overview.alerts.enabled.success', {
      defaultMessage: 'Rule successfully enabled ',
    }),
    text: toMountPoint(
      <RedirectAppLinks application={kibanaService.core.application}>
        <EuiText>
          <FormattedMessage
            id="xpack.uptime.overview.alerts.enabled.success.description"
            defaultMessage="A message will be sent to {actionConnectors} when this monitor is down."
            values={{
              actionConnectors: (
                <strong>{defaultActions.map(({ name }) => name).join(', ')}</strong>
              ),
            }}
          />
        </EuiText>
        <EuiSpacer size="xs" />
        <EuiLink href={alertUrl}>
          {i18n.translate('xpack.uptime.enableAlert.editAlert', {
            defaultMessage: 'Edit alert',
          })}
        </EuiLink>
      </RedirectAppLinks>,
      { theme$ }
    ),
  };
};
