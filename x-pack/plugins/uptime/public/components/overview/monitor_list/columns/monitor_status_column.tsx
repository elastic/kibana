/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useContext } from 'react';
import moment from 'moment';
import { i18n } from '@kbn/i18n';
import styled from 'styled-components';
import { EuiFlexGroup, EuiFlexItem, EuiText, EuiToolTip, EuiBadge, EuiSpacer } from '@elastic/eui';
import { parseTimestamp } from '../parse_timestamp';
import { Ping } from '../../../../../common/runtime_types';
import {
  STATUS,
  SHORT_TIMESPAN_LOCALE,
  UNNAMED_LOCATION,
  SHORT_TS_LOCALE,
} from '../../../../../common/constants';

import { UptimeThemeContext } from '../../../../contexts';
import { euiStyled } from '../../../../../../observability/public';
import { STATUS_DOWN_LABEL, STATUS_UP_LABEL } from '../../../common/translations';

interface MonitorListStatusColumnProps {
  status: string;
  timestamp: string;
  summaryPings: Ping[];
}

const StatusColumnFlexG = styled(EuiFlexGroup)`
  @media (max-width: 574px) {
    min-width: 230px;
  }
`;

export const getHealthMessage = (status: string): string | null => {
  switch (status) {
    case STATUS.UP:
      return STATUS_UP_LABEL;
    case STATUS.DOWN:
      return STATUS_DOWN_LABEL;
    default:
      return null;
  }
};

export const getShortTimeStamp = (timeStamp: moment.Moment, relative = false) => {
  if (relative) {
    const prevLocale: string = moment.locale() ?? 'en';

    const shortLocale = moment.locale(SHORT_TS_LOCALE) === SHORT_TS_LOCALE;

    if (!shortLocale) {
      moment.defineLocale(SHORT_TS_LOCALE, SHORT_TIMESPAN_LOCALE);
    }

    let shortTimestamp;
    if (typeof timeStamp === 'string') {
      shortTimestamp = parseTimestamp(timeStamp).fromNow();
    } else {
      shortTimestamp = timeStamp.fromNow();
    }

    // Reset it so, it does't impact other part of the app
    moment.locale(prevLocale);
    return shortTimestamp;
  } else {
    if (moment().diff(timeStamp, 'd') > 1) {
      return timeStamp.format('ll LTS');
    }
    return timeStamp.format('LTS');
  }
};

export const getLocationStatus = (summaryPings: Ping[], status: string) => {
  const upPings: Set<string> = new Set();
  const downPings: Set<string> = new Set();

  summaryPings.forEach((summaryPing: Ping) => {
    const location = summaryPing?.observer?.geo?.name ?? UNNAMED_LOCATION;

    if (summaryPing.monitor.status === STATUS.UP) {
      upPings.add(location);
    } else if (summaryPing.monitor.status === STATUS.DOWN) {
      downPings.add(location);
    }
  });

  const upsMessage =
    upPings.size > 0
      ? i18n.translate('xpack.uptime.monitorList.statusColumn.locStatusMessage.tooltip.up', {
          defaultMessage: 'Up in {locs}',
          values: { locs: [...upPings].join(', ') },
        })
      : '';

  const downMessage =
    downPings.size > 0
      ? i18n.translate('xpack.uptime.monitorList.statusColumn.locStatusMessage.tooltip.down', {
          defaultMessage: 'Down in {locs}',
          values: { locs: [...downPings].join(', ') },
        })
      : '';

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
    return {
      statusMessage: i18n.translate(
        'xpack.uptime.monitorList.statusColumn.locStatusMessage.multiple',
        {
          defaultMessage: 'in {noLoc} locations',
          values: { noLoc: statusMessage },
        }
      ),
      locTooltip: upsMessage + downMessage,
    };
  }

  return {
    statusMessage: i18n.translate('xpack.uptime.monitorList.statusColumn.locStatusMessage', {
      defaultMessage: 'in {noLoc} location',
      values: { noLoc: statusMessage },
    }),
    locTooltip: upsMessage + downMessage,
  };
};

export const MonitorListStatusColumn = ({
  status,
  summaryPings = [],
  timestamp: tsString,
}: MonitorListStatusColumnProps) => {
  const timestamp = parseTimestamp(tsString);

  const {
    colors: { dangerBehindText },
  } = useContext(UptimeThemeContext);

  const { statusMessage, locTooltip } = getLocationStatus(summaryPings, status);

  return (
    <div>
      <StatusColumnFlexG alignItems="center" gutterSize="none" wrap={false} responsive={false}>
        <EuiFlexItem grow={false} style={{ flexBasis: 40 }}>
          <EuiBadge
            className="eui-textCenter"
            color={status === STATUS.UP ? 'secondary' : dangerBehindText}
          >
            {getHealthMessage(status)}
          </EuiBadge>
        </EuiFlexItem>
      </StatusColumnFlexG>
      <EuiSpacer size="xs" />
      <EuiText size="xs">
        <EuiToolTip
          content={
            <EuiText color="ghost" size="xs">
              {locTooltip}
            </EuiText>
          }
        >
          <PaddedText size="xs" color="subdued" className="eui-textNoWrap">
            {statusMessage},
          </PaddedText>
        </EuiToolTip>
        <EuiToolTip
          content={
            <EuiText color="ghost" size="xs">
              {timestamp.toLocaleString()}
            </EuiText>
          }
        >
          <EuiText size="xs" color="subdued" className="eui-textNoWrap">
            Checked {getShortTimeStamp(timestamp)}
          </EuiText>
        </EuiToolTip>
      </EuiText>
    </div>
  );
};

const PaddedText = euiStyled(EuiText)`
  padding-right: ${(props) => props.theme.eui.paddingSizes.xs};
`;
