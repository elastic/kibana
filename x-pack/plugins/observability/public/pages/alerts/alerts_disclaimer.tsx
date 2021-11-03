/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useEffect } from 'react';
import { EuiLink, EuiCallOut, EuiButton, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';

const LOCAL_STORAGE_KEY_MSG_ACK = 'xpack.observability.alert.ack.experimental.message';

export function AlertsDisclaimer() {
  const [experimentalMsgAck, setExperimentalMsgAck] = useState(false);

  const dismissMessage = () => {
    setExperimentalMsgAck(true);
    localStorage.setItem(LOCAL_STORAGE_KEY_MSG_ACK, 'true');
  };

  useEffect(() => {
    const isExperimentalMsgAck = localStorage.getItem(LOCAL_STORAGE_KEY_MSG_ACK);
    setExperimentalMsgAck(isExperimentalMsgAck === 'true');
  }, []);

  return (
    !experimentalMsgAck && (
      <EuiCallOut
        title={i18n.translate('xpack.observability.alertsDisclaimerTitle', {
          defaultMessage: 'Alert history is currently an experimental feature within observability',
        })}
        color="warning"
        iconType="beaker"
      >
        <FormattedMessage
          id="xpack.observability.alertsDisclaimerText"
          defaultMessage="This functionality may change or be removed completely in a future release. We value your {feedback} as we work to add new capabilities. "
          values={{
            feedback: (
              <EuiLink href="https://discuss.elastic.co/c/observability/82" target="_blank">
                {i18n.translate('xpack.observability.alertsDisclaimerLinkText', {
                  defaultMessage: 'feedback',
                })}
              </EuiLink>
            ),
          }}
        />

        <EuiSpacer size="l" />
        <EuiButton fill color="warning" onClick={dismissMessage} tabIndex={0}>
          {i18n.translate('xpack.observability.alertsDisclaimerDismissMessage', {
            defaultMessage: 'Dismiss message',
          })}
        </EuiButton>
      </EuiCallOut>
    )
  );
}
