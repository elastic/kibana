/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiLink } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { usePluginContext } from '../../hooks/use_plugin_context';

export function AlertsDisclaimer() {
  const { core } = usePluginContext();
  const { prepend } = core.http.basePath;
  return (
    <FormattedMessage
      id="xpack.observability.alertsDisclaimerText"
      defaultMessage="This functionality may change or be removed completely in a future release. We value your {feedback} as we work to add new capabilities. "
      values={{
        feedback: (
          <EuiLink href={prepend('https://discuss.elastic.co/c/observability/82')}>
            {i18n.translate('xpack.observability.alertsDisclaimerLinkText', {
              defaultMessage: 'feedback',
            })}
          </EuiLink>
        ),
      }}
    />
  );
}
