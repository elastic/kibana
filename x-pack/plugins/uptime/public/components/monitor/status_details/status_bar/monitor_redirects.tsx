/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiPopover } from '@elastic/eui';
import styled from 'styled-components';
import { Ping } from '../../../../../common/runtime_types';
import { PingRedirects } from '../../ping_list/ping_redirects';
import { MonListDescription, MonListTitle } from './status_bar';

interface Props {
  monitorStatus: Ping | null;
}

const RedirectBtn = styled.span`
  cursor: pointer;
`;

export const MonitorRedirects: React.FC<Props> = ({ monitorStatus }) => {
  const list = monitorStatus?.http?.response?.redirects;

  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const button = (
    <MonListDescription>
      <RedirectBtn
        className="euiLink euiLink--primary"
        onClick={() => setIsPopoverOpen(!isPopoverOpen)}
        data-test-subj="uptimeMonitorRedirectInfo"
      >
        {i18n.translate('xpack.uptime.monitorList.redirects.title.number', {
          defaultMessage: '{number}',
          values: {
            number: list?.length ?? 0,
          },
        })}
      </RedirectBtn>
    </MonListDescription>
  );

  return list ? (
    <>
      <MonListTitle>Redirects</MonListTitle>
      <EuiPopover
        button={button}
        isOpen={isPopoverOpen}
        anchorPosition="downLeft"
        closePopover={() => setIsPopoverOpen(false)}
      >
        <PingRedirects monitorStatus={monitorStatus} />
      </EuiPopover>
    </>
  ) : null;
};
