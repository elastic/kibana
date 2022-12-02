/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiLink, EuiText, useEuiTheme } from '@elastic/eui';
import { Ping } from '../../../../../../common/runtime_types';
import { useSyntheticsSettingsContext } from '../../../contexts';
import { useKibanaDateFormat } from '../../../../../hooks/use_kibana_date_format';
import { formatTestRunAt } from '../../../utils/monitor_test_result/test_time_formats';

export const TestDetailsLink = ({
  isBrowserMonitor,
  timestamp,
  ping,
}: {
  isBrowserMonitor: boolean;
  timestamp: string;
  ping: Ping;
}) => {
  const { euiTheme } = useEuiTheme();
  const { basePath } = useSyntheticsSettingsContext();

  const format = useKibanaDateFormat();
  const timestampText = (
    <EuiText size="s" css={{ fontWeight: euiTheme.font.weight.medium }}>
      {formatTestRunAt(timestamp, format)}
    </EuiText>
  );

  return isBrowserMonitor ? (
    <EuiLink
      href={`${basePath}/app/synthetics/monitor/${ping?.config_id ?? ''}/test-run/${
        ping.monitor.check_group
      }`}
    >
      {timestampText}
    </EuiLink>
  ) : (
    timestampText
  );
};
