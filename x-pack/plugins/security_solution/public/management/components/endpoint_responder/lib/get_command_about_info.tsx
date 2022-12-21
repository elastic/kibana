/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiIconTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

const UNSUPPORTED_COMMAND_INFO = i18n.translate(
  'xpack.securitySolution.endpointConsoleCommands.suspendProcess.unsupportedCommandInfo',
  {
    defaultMessage:
      'This version of the Endpoint does not support this command. Upgrade your Agent in Fleet to use the latest response actions.',
  }
);

const DisabledTooltip = React.memo(() => {
  return <EuiIconTip content={UNSUPPORTED_COMMAND_INFO} type="alert" color="danger" />;
});
DisabledTooltip.displayName = 'DisabledTooltip';

export const getCommandAboutInfo = ({
  aboutInfo,
  isSupported,
}: {
  aboutInfo: string;
  isSupported: boolean;
}) => {
  return isSupported ? (
    aboutInfo
  ) : (
    <>
      {aboutInfo} <DisabledTooltip />
    </>
  );
};
