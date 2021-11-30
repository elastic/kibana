/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiEmptyPrompt, EuiLink } from '@elastic/eui';
import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { useKibana } from '../../../../../../../../../src/plugins/kibana_react/public';

export function ApiKeysNotEnabled() {
  const {
    services: { docLinks },
  } = useKibana();

  return (
    <EuiEmptyPrompt
      title={
        <h2>
          {i18n.translate(
            'xpack.apm.settings.agentKeys.apiKeysDisabledErrorTitle',
            {
              defaultMessage: 'API keys not enabled in Elasticsearch',
            }
          )}
        </h2>
      }
      iconType="alert"
      body={
        <p>
          <FormattedMessage
            id="xpack.apm.settings.agentKeys.apiKeysDisabledErrorDescription"
            defaultMessage="Contact your system administrator and refer to the {link} to enable API keys."
            values={{
              link: (
                <EuiLink
                  href={docLinks?.links.security.apiKeyServiceSettings}
                  target="_blank"
                >
                  {i18n.translate(
                    'xpack.apm.settings.agentKeys.apiKeysDisabledErrorLinkText',
                    {
                      defaultMessage: 'docs',
                    }
                  )}
                </EuiLink>
              ),
            }}
          />
        </p>
      }
    />
  );
}
