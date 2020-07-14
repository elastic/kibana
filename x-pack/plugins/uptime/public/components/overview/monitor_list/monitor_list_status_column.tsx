/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import moment from 'moment';
import { i18n } from '@kbn/i18n';
import { upperFirst } from 'lodash';
import styled from 'styled-components';
import { EuiHealth, EuiFlexGroup, EuiFlexItem, EuiText, EuiToolTip } from '@elastic/eui';
import { parseTimestamp } from './parse_timestamp';
import { Ping } from '../../../../common/runtime_types';
import {
  STATUS,
  SHORT_TIMESPAN_LOCALE,
  UNNAMED_LOCATION,
  SHORT_TS_LOCALE,
} from '../../../../common/constants';

import * as labels from './translations';

interface MonitorListStatusColumnProps {
  status: string;
  timestamp: string;
  summaryPings: Ping[];
}

const PaddedSpan = styled.span`
  padding-left: 17px;
`;

const StatusColumnFlexG = styled(EuiFlexGroup)`
  @media (max-width: 574px) {
    min-width: 230px;
  }
`;

const getHealthColor = (status: string): string => {
  switch (status) {
    case STATUS.UP:
      return 'success';
    case STATUS.DOWN:
      return 'danger';
    default:
      return '';
  }
};

const getHealthMessage = (status: string): string | null => {
  switch (status) {
    case STATUS.UP:
      return labels.UP;
    case STATUS.DOWN:
      return labels.DOWN;
    default:
      return null;
  }
};

const getRelativeShortTimeStamp = (timeStamp: any) => {
  const prevLocale: string = moment.locale() ?? 'en';

  const shortLocale = moment.locale(SHORT_TS_LOCALE) === SHORT_TS_LOCALE;

  if (!shortLocale) {
    moment.defineLocale(SHORT_TS_LOCALE, SHORT_TIMESPAN_LOCALE);
  }

  const shortTimestamp = parseTimestamp(timeStamp).fromNow();

  // Reset it so, it does't impact other part of the app
  moment.locale(prevLocale);
  return shortTimestamp;
};

export const getLocationStatus = (summaryPings: Ping[], status: string) => {
  const upPings: Set<string> = new Set();
  const downPings: Set<string> = new Set();

  summaryPings.forEach((summaryPing: Ping) => {
    const location = summaryPing?.observer?.geo?.name ?? UNNAMED_LOCATION;

    if (summaryPing.monitor.status === STATUS.UP) {
      upPings.add(upperFirst(location));
    } else if (summaryPing.monitor.status === STATUS.DOWN) {
      downPings.add(upperFirst(location));
    }
  });

  // if monitor is down in one dns, it will be considered down so removing it from up list
  const absUpChecks: Set<string> = new Set([...upPings].filter((item) => !downPings.has(item)));

  const totalLocations = absUpChecks.size + downPings.size;
  let statusMessage = '';
  if (status === STATUS.DOWN) {
    statusMessage = `${downPings.size}/${totalLocations}`;
  } else {
    statusMessage = `${absUpChecks.size}/${totalLocations}`;
  }

  if (totalLocations > 1) {
    return i18n.translate('xpack.uptime.monitorList.statusColumn.locStatusMessage.multiple', {
      defaultMessage: 'in {noLoc} Locations',
      values: { noLoc: statusMessage },
    });
  }

  return i18n.translate('xpack.uptime.monitorList.statusColumn.locStatusMessage', {
    defaultMessage: 'in {noLoc} Location',
    values: { noLoc: statusMessage },
  });
};

export const MonitorListStatusColumn = ({
  status,
  summaryPings = [],
  timestamp: tsString,
}: MonitorListStatusColumnProps) => {
  const timestamp = parseTimestamp(tsString);
  return (
    <StatusColumnFlexG alignItems="center" gutterSize="none" wrap={false} responsive={false}>
      <EuiFlexItem grow={1} style={{ flexBasis: 40 }}>
        <EuiHealth color={getHealthColor(status)} style={{ display: 'block' }}>
          {getHealthMessage(status)}
        </EuiHealth>
        <PaddedSpan>
          <EuiToolTip
            content={
              <EuiText color="ghost" size="xs">
                {timestamp.toLocaleString()}
              </EuiText>
            }
          >
            <EuiText size="xs" color="subdued">
              {getRelativeShortTimeStamp(tsString)}
            </EuiText>
          </EuiToolTip>
        </PaddedSpan>
      </EuiFlexItem>
      <EuiFlexItem grow={2}>
        <EuiText size="s">{getLocationStatus(summaryPings, status)}</EuiText>
      </EuiFlexItem>
    </StatusColumnFlexG>
  );
};
