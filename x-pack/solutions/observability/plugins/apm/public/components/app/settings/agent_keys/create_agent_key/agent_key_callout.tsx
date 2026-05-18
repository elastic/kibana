/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiButtonIcon,
  EuiCallOut,
  EuiCopy,
  EuiFieldPassword,
  EuiSpacer,
  EuiToolTip,
} from '@elastic/eui';

interface Props {
  name: string;
  token: string;
}

export function AgentKeyCallOut({ name, token }: Props) {
  return (
    <>
      <EuiCallOut
        title={i18n.translate('xpack.apm.settings.agentKeys.copyAgentKeyField.title', {
          defaultMessage: 'Created "{name}" key',
          values: { name },
        })}
        color="success"
        iconType="check"
      >
        <p>
          {i18n.translate('xpack.apm.settings.agentKeys.copyAgentKeyField.message', {
            defaultMessage: 'Copy this key now. You will not be able to view it again.',
          })}
        </p>
        <EuiFieldPassword
          data-test-subj="apmAgentKeyCallOutFieldText"
          type="dual"
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
                <EuiToolTip
                  content={i18n.translate(
                    'xpack.apm.settings.agentKeys.copyAgentKeyField.copyButton',
                    {
                      defaultMessage: 'Copy to clipboard',
                    }
                  )}
                  disableScreenReaderOutput
                >
                  <EuiButtonIcon
                    data-test-subj="apmAgentKeyCallOutButton"
                    iconType="copy"
                    onClick={copy}
                    aria-label={i18n.translate(
                      'xpack.apm.settings.agentKeys.copyAgentKeyField.copyButton',
                      {
                        defaultMessage: 'Copy to clipboard',
                      }
                    )}
                  />
                </EuiToolTip>
              )}
            </EuiCopy>
          }
        />
      </EuiCallOut>
      <EuiSpacer size="m" />
    </>
  );
}
