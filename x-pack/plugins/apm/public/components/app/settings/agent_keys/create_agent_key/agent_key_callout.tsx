/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiSpacer,
  EuiCallOut,
  EuiButtonIcon,
  EuiCopy,
  EuiFieldText,
} from '@elastic/eui';

interface Props {
  name: string;
  token: string;
}

export function AgentKeyCallOut({ name, token }: Props) {
  return (
    <>
      <EuiCallOut
        title={i18n.translate(
          'xpack.apm.settings.agentKeys.copyAgentKeyField.title',
          {
            defaultMessage: 'Created "{name}" key',
            values: { name },
          }
        )}
        color="success"
        iconType="check"
      >
        <p>
          {i18n.translate(
            'xpack.apm.settings.agentKeys.copyAgentKeyField.message',
            {
              defaultMessage:
                'Copy this key now. You will not be able to view it again.',
            }
          )}
        </p>
        <EuiFieldText
          readOnly
          value={token}
          aria-label={i18n.translate(
            'xpack.apm.settings.agentKeys.copyAgentKeyField.agentKeyLabel',
            {
              defaultMessage: 'APM agent key',
            }
          )}
          prepend="Base64"
          append={
            <EuiCopy textToCopy={token}>
              {(copy) => (
                <EuiButtonIcon
                  iconType="copyClipboard"
                  onClick={copy}
                  color="success"
                  style={{ backgroundColor: 'transparent' }}
                  aria-label={i18n.translate(
                    'xpack.apm.settings.agentKeys.copyAgentKeyField.copyButton',
                    {
                      defaultMessage: 'Copy to clipboard',
                    }
                  )}
                />
              )}
            </EuiCopy>
          }
        />
      </EuiCallOut>
      <EuiSpacer size="m" />
    </>
  );
}
