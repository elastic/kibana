/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useContext, useState } from 'react';
import moment, { Moment } from 'moment';
import { i18n } from '@kbn/i18n';
import styled from 'styled-components';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiToolTip,
  EuiBadge,
  EuiSpacer,
  EuiButtonIcon,
  EuiLoadingSpinner,
  EuiHighlight,
  EuiHorizontalRule,
} from '@elastic/eui';
import { useSelector } from 'react-redux';
import { parseTimestamp } from '../parse_timestamp';
import { DataStream, Ping } from '../../../../../common/runtime_types';
import {
  STATUS,
  SHORT_TIMESPAN_LOCALE,
  UNNAMED_LOCATION,
  SHORT_TS_LOCALE,
} from '../../../../../common/constants';

import { UptimeThemeContext } from '../../../../contexts';
import { euiStyled } from '../../../../../../../../src/plugins/kibana_react/common';
import { STATUS_DOWN_LABEL, STATUS_UP_LABEL } from '../../../common/translations';
import { triggerMonitor } from '../../../../state/api';
import { useFetcher } from '../../../../../../observability/public';
import { MonitorProgress } from './progress/monitor_progress';
import { refreshedMonitorSelector } from '../../../../state/reducers/monitor_list';

interface MonitorListStatusColumnProps {
  configId?: string;
  monitorId?: string;
  status: string;
  monitorType: string;
  timestamp: string;
  duration: number;
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

    // Reset it so, it doesn't impact other part of the app
    moment.locale(prevLocale);
    return shortTimestamp;
  } else {
    if (moment().diff(timeStamp, 'd') >= 1) {
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
      locTooltip: (
        <>
          <span>{upsMessage}</span>
          <EuiSpacer size="xs" />
          <span>{downMessage}</span>
        </>
      ),
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
  monitorType,
  configId,
  monitorId,
  status,
  duration,
  summaryPings = [],
  timestamp: tsString,
}: MonitorListStatusColumnProps) => {
  const timestamp = parseTimestamp(tsString);

  const [triggerTest, setTriggerTest] = useState<string>();

  const {
    colors: { dangerBehindText },
  } = useContext(UptimeThemeContext);

  const { statusMessage, locTooltip } = getLocationStatus(summaryPings, status);

  const { loading, data } = useFetcher(() => {
    return triggerMonitor({ id: triggerTest });
  }, [triggerTest]);

  const triggerNowClick = () => {
    if (configId) {
      setTriggerTest(configId);
    }
  };

  const stopProgressTrack = useCallback(() => {
    setTriggerTest(undefined);
  }, []);

  const refreshedMonitorIds = useSelector(refreshedMonitorSelector);

  return (
    <div>
      <StatusColumnFlexG alignItems="center" gutterSize="xs" wrap={false} responsive={false}>
        <EuiFlexItem grow={false} style={{ flexBasis: 40 }}>
          {triggerTest && data?.triggerId ? (
            <MonitorProgress
              monitorId={monitorId!}
              configId={triggerTest}
              triggerId={data?.triggerId}
              monitorType={monitorType as DataStream}
              duration={duration}
              stopProgressTrack={stopProgressTrack}
            />
          ) : (
            <EuiBadge
              className="eui-textCenter"
              color={status === STATUS.UP ? 'success' : dangerBehindText}
            >
              {getHealthMessage(status)}
            </EuiBadge>
          )}
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          {loading ? (
            <EuiLoadingSpinner size="s" />
          ) : (
            <EuiToolTip content="Test now">
              <EuiButtonIcon
                iconType="play"
                onClick={() => triggerNowClick()}
                isDisabled={Boolean(triggerTest)}
                aria-label={'CLick to run test now'}
              />
            </EuiToolTip>
          )}
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
            <>
              <EuiText color="text" size="xs">
                <strong> {timestamp.fromNow()}</strong>
              </EuiText>
              <EuiHorizontalRule margin="xs" />
              <EuiText color="ghost" size="xs">
                {timestamp.toLocaleString()}
              </EuiText>
            </>
          }
        >
          {monitorId && refreshedMonitorIds.includes(monitorId) ? (
            <EuiHighlight highlightAll={true} search={getCheckedLabel(timestamp)}>
              {getCheckedLabel(timestamp)}
            </EuiHighlight>
          ) : (
            <EuiText size="xs" color="subdued" className="eui-textNoWrap">
              {getCheckedLabel(timestamp)}
            </EuiText>
          )}
        </EuiToolTip>
      </EuiText>
    </div>
  );
};

const getCheckedLabel = (timestamp: Moment) => {
  return i18n.translate('xpack.uptime.monitorList.statusColumn.checkedTimestamp', {
    defaultMessage: 'Checked {timestamp}',
    values: { timestamp: getShortTimeStamp(timestamp) },
  });
};

const PaddedText = euiStyled(EuiText)`
  padding-right: ${(props) => props.theme.eui.paddingSizes.xs};
`;
