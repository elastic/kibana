/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { EuiLink, EuiCallOut, EuiButton, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

const LOCAL_STORAGE_KEY_MSG_ACK = 'xpack.observability.alert.ack.experimental.message';

export function AlertsDisclaimer() {
  const getCurrentExperimentalMsgAckState = () => {
    try {
      const isExperimentalMsgAck = localStorage.getItem(LOCAL_STORAGE_KEY_MSG_ACK);
      return isExperimentalMsgAck && JSON.parse(isExperimentalMsgAck) === true;
    } catch {
      return false;
    }
  };

  const [experimentalMsgAck, setExperimentalMsgAck] = useState(getCurrentExperimentalMsgAckState);

  const dismissMessage = () => {
    setExperimentalMsgAck(true);
    localStorage.setItem(LOCAL_STORAGE_KEY_MSG_ACK, 'true');
  };

  return (
    <>
      {!experimentalMsgAck && (
        <EuiCallOut
          data-test-subj="o11yExperimentalDisclaimer"
          title={i18n.translate('xpack.observability.alertsDisclaimerTitle', {
            defaultMessage:
              'Alert history is currently an experimental feature within Observability',
          })}
          color="warning"
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
          <EuiButton
            data-test-subj="o11yExperimentalDisclaimerDismissBtn"
            color="warning"
            onClick={dismissMessage}
            tabIndex={0}
          >
            {i18n.translate('xpack.observability.alertsDisclaimerDismissMessage', {
              defaultMessage: 'Dismiss message',
            })}
          </EuiButton>
        </EuiCallOut>
      )}
    </>
  );
}
