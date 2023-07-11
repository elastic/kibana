/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiLink, EuiText, useEuiTheme } from '@elastic/eui';
import { useSelectedLocation } from '../../monitor_details/hooks/use_selected_location';
import { Ping } from '../../../../../../common/runtime_types';
import { useSyntheticsSettingsContext } from '../../../contexts';
import { useDateFormat } from '../../../../../hooks/use_date_format';

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
  const selectedLocation = useSelectedLocation();

  const formatter = useDateFormat();
  const timestampText = (
    <EuiText size="s" css={{ fontWeight: euiTheme.font.weight.medium }}>
      {formatter(timestamp)}
    </EuiText>
  );

  return isBrowserMonitor ? (
    <EuiLink
      data-test-subj="syntheticsTestDetailsLinkLink"
      href={getTestRunDetailLink({
        basePath,
        checkGroup: ping.monitor.check_group,
        monitorId: ping?.config_id ?? '',
        locationId: selectedLocation?.id,
      })}
    >
      {timestampText}
    </EuiLink>
  ) : (
    timestampText
  );
};

export const getTestRunDetailLink = ({
  monitorId,
  basePath,
  checkGroup,
  locationId,
}: {
  monitorId: string;
  checkGroup: string;
  basePath: string;
  locationId?: string;
}) => {
  const testRunUrl = `/monitor/${monitorId}/test-run/${checkGroup}?locationId=${locationId}`;
  return `${basePath}/app/synthetics${testRunUrl}`;
};

export const getTestRunDetailRelativeLink = ({
  monitorId,
  checkGroup,
  locationId,
}: {
  monitorId: string;
  checkGroup: string;
  locationId?: string;
}) => {
  return `/monitor/${monitorId}/test-run/${checkGroup}?locationId=${locationId}`;
};
