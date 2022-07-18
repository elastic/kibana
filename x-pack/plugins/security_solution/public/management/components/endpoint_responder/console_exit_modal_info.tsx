/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import React, { memo } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiText } from '@elastic/eui';

import { CONSOLE_EXIT_MODAL_INFO } from '../console/components/console_manager/translations';

const actionLogLink = i18n.translate('xpack.securitySolution.consolePageOverlay.exitModal.link', {
  defaultMessage: 'Action log',
});

export const HostNameText = ({ hostName }: { hostName: string }) => (
  <EuiText size="s" style={{ maxWidth: 100, display: 'inline-flex' }}>
    <span className="eui-textTruncate">
      <strong>{hostName}</strong>
    </span>
  </EuiText>
);

export const ConsoleExitModalInfo = memo(({ hostName }: { hostName: string }) => {
  return (
    <EuiText size="s">
      <FormattedMessage
        id="xpack.securitySolution.consolePageOverlay.exitModal.actionLogLink"
        defaultMessage="{genericMessage} You may track progress of the action on {hostName}'s {link}."
        values={{
          genericMessage: CONSOLE_EXIT_MODAL_INFO.genericMessage,
          hostName: <HostNameText hostName={hostName} />,
          link: <strong>{actionLogLink}</strong>,
        }}
      />
    </EuiText>
  );
});

ConsoleExitModalInfo.displayName = 'ConsoleExitModalInfo';
