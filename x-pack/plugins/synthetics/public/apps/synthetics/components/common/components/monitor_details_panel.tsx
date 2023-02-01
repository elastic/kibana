/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiLink,
  EuiText,
  EuiSpacer,
  EuiDescriptionList,
  EuiLoadingContent,
  EuiDescriptionListTitle,
  EuiDescriptionListDescription,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useDispatch } from 'react-redux';
import { euiStyled } from '@kbn/kibana-react-plugin/common';
import { TagsBadges } from './tag_badges';
import { useFormatTestRunAt } from '../../../utils/monitor_test_result/test_time_formats';
import { PanelWithTitle } from './panel_with_title';
import { MonitorEnabled } from '../../monitors_page/management/monitor_list_table/monitor_enabled';
import { getMonitorAction } from '../../../state';
import { LocationsStatus } from '../../monitor_details/monitor_summary/locations_status';
import {
  ConfigKey,
  EncryptedSyntheticsSavedMonitor,
  MonitorFields,
  Ping,
} from '../../../../../../common/runtime_types';
import { MonitorTypeBadge } from './monitor_type_badge';

const TitleLabel = euiStyled(EuiDescriptionListTitle)`
  width: 40%;
`;

const DescriptionLabel = euiStyled(EuiDescriptionListDescription)`
  width: 60%;
`;

export const MonitorDetailsPanel = ({
  monitor,
  latestPing,
  loading,
  configId,
  hideEnabled = false,
}: {
  latestPing?: Ping;
  loading: boolean;
  configId: string;
  monitor: EncryptedSyntheticsSavedMonitor | null;
  hideEnabled?: boolean;
}) => {
  const dispatch = useDispatch();

  if (!monitor) {
    return <EuiLoadingContent lines={8} />;
  }

  return (
    <PanelWithTitle paddingSize="m" title={MONITOR_DETAILS_LABEL} titleLeftAlign>
      <WrapperStyle>
        <EuiSpacer size="s" />
        <EuiDescriptionList type="column" compressed align="left">
          {!hideEnabled && (
            <>
              <TitleLabel>{ENABLED_LABEL}</TitleLabel>
              <DescriptionLabel>
                {monitor && (
                  <MonitorEnabled
                    initialLoading={loading}
                    configId={configId}
                    monitor={monitor}
                    reloadPage={() => {
                      dispatch(getMonitorAction.get({ monitorId: configId }));
                    }}
                  />
                )}
              </DescriptionLabel>
            </>
          )}
          <TitleLabel>{URL_LABEL}</TitleLabel>
          <DescriptionLabel style={{ wordBreak: 'break-all' }}>
            <EuiLink
              href={latestPing?.url?.full ?? (monitor as unknown as MonitorFields)[ConfigKey.URLS]}
              external
            >
              {latestPing?.url?.full ?? (monitor as unknown as MonitorFields)[ConfigKey.URLS]}
            </EuiLink>
          </DescriptionLabel>
          <TitleLabel>{LAST_RUN_LABEL}</TitleLabel>
          <DescriptionLabel>
            {latestPing?.timestamp ? (
              <Time timestamp={latestPing?.timestamp} />
            ) : (
              <EuiText color="subdued">--</EuiText>
            )}
          </DescriptionLabel>
          <TitleLabel>{LAST_MODIFIED_LABEL}</TitleLabel>
          <DescriptionLabel>
            <Time timestamp={monitor.updated_at} />
          </DescriptionLabel>
          {monitor[ConfigKey.PROJECT_ID] && (
            <>
              <TitleLabel>{PROJECT_ID_LABEL}</TitleLabel>
              <DescriptionLabel>{monitor[ConfigKey.PROJECT_ID]}</DescriptionLabel>
            </>
          )}
          <TitleLabel>{MONITOR_ID_ITEM_TEXT}</TitleLabel>
          <DescriptionLabel>{configId}</DescriptionLabel>
          <TitleLabel>{MONITOR_TYPE_LABEL}</TitleLabel>
          <DescriptionLabel>
            <MonitorTypeBadge monitor={monitor} />
          </DescriptionLabel>
          <TitleLabel>{FREQUENCY_LABEL}</TitleLabel>
          <DescriptionLabel>{frequencyStr(monitor[ConfigKey.SCHEDULE])}</DescriptionLabel>
          <TitleLabel>{LOCATIONS_LABEL}</TitleLabel>
          <DescriptionLabel>
            <LocationsStatus configId={configId} monitorLocations={monitor.locations} />
          </DescriptionLabel>

          <TitleLabel>{TAGS_LABEL}</TitleLabel>
          <DescriptionLabel>
            <TagsBadges tags={monitor[ConfigKey.TAGS]} />
          </DescriptionLabel>
        </EuiDescriptionList>
      </WrapperStyle>
    </PanelWithTitle>
  );
};

export function frequencyStr(frequency: { number: string; unit: string }) {
  return translateUnitMessage(
    `${frequency.number} ${unitToString(frequency.unit, parseInt(frequency.number, 10))}`
  );
}

function unitToString(unit: string, n: number) {
  switch (unit) {
    case 's':
      return secondsString(n);
    case 'm':
      return minutesString(n);
    case 'h':
      return hoursString(n);
    case 'd':
      return daysString(n);
    default:
      return unit;
  }
}

const secondsString = (n: number) =>
  i18n.translate('xpack.synthetics.monitorDetail.seconds', {
    defaultMessage: '{n, plural, one {second} other {seconds}}',
    values: { n },
  });

const minutesString = (n: number) =>
  i18n.translate('xpack.synthetics.monitorDetail.minutes', {
    defaultMessage: '{n, plural, one {minute} other {minutes}}',
    values: { n },
  });

const hoursString = (n: number) =>
  i18n.translate('xpack.synthetics.monitorDetail.hours', {
    defaultMessage: '{n, plural, one {hour} other {hours}}',
    values: { n },
  });

const daysString = (n: number) =>
  i18n.translate('xpack.synthetics.monitorDetail.days', {
    defaultMessage: '{n, plural, one {day} other {days}}',
    values: { n },
  });

function translateUnitMessage(unitMsg: string) {
  return i18n.translate('xpack.synthetics.monitorList.flyout.unitStr', {
    defaultMessage: 'Every {unitMsg}',
    values: { unitMsg },
    description: 'This displays a message like "Every 10 minutes" or "Every 30 seconds"',
  });
}

const Time = ({ timestamp }: { timestamp?: string }) => {
  const dateTimeFormatted = useFormatTestRunAt(timestamp);

  return timestamp ? <time dateTime={timestamp}>{dateTimeFormatted}</time> : null;
};

export const WrapperStyle = euiStyled.div`
  .euiDescriptionList.euiDescriptionList--column > *,
  .euiDescriptionList.euiDescriptionList--responsiveColumn > * {
    margin-top: ${({ theme }) => theme.eui.euiSizeS};
  }
`;

const FREQUENCY_LABEL = i18n.translate('xpack.synthetics.management.monitorList.frequency', {
  defaultMessage: 'Frequency',
});
const LOCATIONS_LABEL = i18n.translate('xpack.synthetics.management.monitorList.locations', {
  defaultMessage: 'Locations',
});

const URL_LABEL = i18n.translate('xpack.synthetics.management.monitorList.url', {
  defaultMessage: 'URL',
});

const TAGS_LABEL = i18n.translate('xpack.synthetics.management.monitorList.tags', {
  defaultMessage: 'Tags',
});

const ENABLED_LABEL = i18n.translate('xpack.synthetics.detailsPanel.monitorDetails.enabled', {
  defaultMessage: 'Enabled',
});

const MONITOR_TYPE_LABEL = i18n.translate(
  'xpack.synthetics.detailsPanel.monitorDetails.monitorType',
  {
    defaultMessage: 'Monitor type',
  }
);

const MONITOR_DETAILS_LABEL = i18n.translate('xpack.synthetics.detailsPanel.monitorDetails', {
  defaultMessage: 'Monitor details',
});

const LAST_MODIFIED_LABEL = i18n.translate('xpack.synthetics.monitorList.lastModified', {
  defaultMessage: 'Last modified',
});

const LAST_RUN_LABEL = i18n.translate('xpack.synthetics.monitorList.lastRunHeaderText', {
  defaultMessage: 'Last run',
});

const PROJECT_ID_LABEL = i18n.translate('xpack.synthetics.monitorList.projectIdHeaderText', {
  defaultMessage: 'Project ID',
});

const MONITOR_ID_ITEM_TEXT = i18n.translate('xpack.synthetics.monitorList.monitorIdItemText', {
  defaultMessage: 'Monitor ID',
});
