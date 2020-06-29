/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiPopover, EuiButtonEmpty } from '@elastic/eui';
import { Ping } from '../../../../../common/runtime_types';
import { PingRedirects } from '../../ping_list/ping_redirects';

interface Props {
  monitorStatus: Ping | null;
}

export const MonitorRedirects: React.FC<Props> = ({ monitorStatus }) => {
  const list = monitorStatus?.http?.response?.redirects;

  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const button = (
    <EuiButtonEmpty
      flush="left"
      onClick={() => setIsPopoverOpen(!isPopoverOpen)}
      data-test-subj="uptimeMonitorRedirectInfo"
    >
      {i18n.translate('xpack.uptime.monitorList.redirects.title.number', {
        defaultMessage: 'Heartbeat followed {number} redirects while executing ping.',
        values: {
          number: list?.length ?? 0,
        },
      })}
    </EuiButtonEmpty>
  );

  return list ? (
    <EuiPopover
      button={button}
      isOpen={isPopoverOpen}
      anchorPosition="downLeft"
      closePopover={() => setIsPopoverOpen(false)}
    >
      <PingRedirects monitorStatus={monitorStatus} />
    </EuiPopover>
  ) : null;
};
