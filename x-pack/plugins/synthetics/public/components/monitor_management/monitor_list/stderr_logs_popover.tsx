/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiPopover } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import styled from 'styled-components';
import { StdErrorLogs } from '../../synthetics/check_steps/stderr_logs';

export const StdErrorPopover = ({
  checkGroup,
  button,
  isOpen,
  setIsOpen,
  summaryMessage,
}: {
  isOpen: boolean;
  setIsOpen: (val: boolean) => void;
  checkGroup: string;
  summaryMessage?: string;
  button: JSX.Element;
}) => {
  return (
    <EuiPopover isOpen={isOpen} closePopover={() => setIsOpen(false)} button={button}>
      <Container>
        <StdErrorLogs
          checkGroup={checkGroup}
          title={ERROR_LOGS_LABEL}
          summaryMessage={summaryMessage}
        />
      </Container>
    </EuiPopover>
  );
};

const Container = styled.div`
  width: 650px;
  height: 400px;
  overflow: scroll;
`;

export const getInlineErrorLabel = (message?: string) => {
  return i18n.translate('xpack.uptime.monitorList.statusColumn.error.messageLabel', {
    defaultMessage: '{message}. Click for more details.',
    values: { message },
  });
};

export const ERROR_LOGS_LABEL = i18n.translate('xpack.uptime.monitorList.statusColumn.error.logs', {
  defaultMessage: 'Error logs',
});
