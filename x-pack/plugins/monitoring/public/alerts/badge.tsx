/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';
import moment from 'moment';
import { i18n } from '@kbn/i18n';
import {
  EuiContextMenu,
  EuiPopover,
  EuiBadge,
  EuiFlexGrid,
  EuiFlexItem,
  EuiText,
  EuiTextColor,
  EuiLink,
} from '@elastic/eui';
import { CommonAlertStatus, CommonAlertState } from '../../common/types/alerts';
import { AlertSeverity } from '../../common/enums';
// @ts-ignore
import { formatDateTimeLocal } from '../../common/formatting';
import { AlertMessage, AlertState } from '../../common/types/alerts';
import { AlertPanel } from './panel';
import { Legacy } from '../legacy_shims';
import { isInSetupMode } from '../lib/setup_mode';
import { SetupModeContext } from '../components/setup_mode/setup_mode_context';
import { AlertStatusAndState } from './types';

function getDateFromState(state: CommonAlertState) {
  const timestamp = state.state.ui.triggeredMS;
  const tz = Legacy.shims.uiSettings.get('dateFormat:tz');
  const timezone = !tz || tz === 'Browser' ? moment.tz.guess() : tz;
  return moment.tz(timestamp, timezone).fromNow();
}

export const numberOfAlertsLabel = (count: number) => `${count} alert${count > 1 ? 's' : ''}`;

const MAX_TO_SHOW_IN_LIST = 5;

interface AlertPanelItem {
  name?: React.ReactElement;
  panel?: number;
  isSeparator?: boolean | undefined;
}

interface Props {
  alerts: { [alertTypeId: string]: CommonAlertStatus };
  viewMoreUrl?: string;
  stateFilter: (state: AlertState) => boolean;
  nextStepsFilter: (nextStep: AlertMessage) => boolean;
}
export const AlertsBadge: React.FC<Props> = (props: Props) => {
  const { viewMoreUrl, stateFilter = () => true, nextStepsFilter = () => true } = props;
  const [showPopover, setShowPopover] = React.useState<AlertSeverity | boolean | null>(null);
  const inSetupMode = isInSetupMode(React.useContext(SetupModeContext));
  const alerts = Object.values(props.alerts).filter(Boolean);

  if (alerts.length === 0) {
    return null;
  }

  const badges = [];

  if (inSetupMode) {
    const button = (
      <EuiBadge
        iconType="bell"
        onClickAriaLabel={numberOfAlertsLabel(alerts.length)}
        onClick={() => setShowPopover(true)}
      >
        {numberOfAlertsLabel(alerts.length)}
      </EuiBadge>
    );
    const panels = [
      {
        id: 0,
        title: i18n.translate('xpack.monitoring.alerts.badge.panelTitle', {
          defaultMessage: 'Alerts',
        }),
        items: alerts.map(({ alert }, index) => {
          return {
            name: <EuiText>{alert.label}</EuiText>,
            panel: index + 1,
          };
        }),
      },
      ...alerts.map((alertStatus, index) => {
        return {
          id: index + 1,
          title: alertStatus.alert.label,
          width: 400,
          content: <AlertPanel alert={alertStatus} nextStepsFilter={nextStepsFilter} />,
        };
      }),
    ];

    badges.push(
      <EuiPopover
        id="monitoringAlertMenu"
        button={button}
        isOpen={showPopover === true}
        closePopover={() => setShowPopover(null)}
        panelPaddingSize="none"
        anchorPosition="downLeft"
      >
        <EuiContextMenu initialPanelId={0} panels={panels} />
      </EuiPopover>
    );
  } else {
    const bySeverity = {
      [AlertSeverity.Danger]: [] as AlertStatusAndState[],
      [AlertSeverity.Warning]: [] as AlertStatusAndState[],
      [AlertSeverity.Success]: [] as AlertStatusAndState[],
    };

    for (const alert of alerts) {
      for (const alertState of alert.states) {
        if (alertState.firing && stateFilter(alertState.state)) {
          const state = alertState.state as AlertState;
          bySeverity[state.ui.severity].push({
            alertState,
            alert,
          });
        }
      }
    }

    const severitiesToShow = [AlertSeverity.Danger, AlertSeverity.Warning];
    for (const severity of severitiesToShow) {
      const list = bySeverity[severity];
      if (list.length === 0) {
        continue;
      }

      const button = (
        <EuiBadge
          iconType="bell"
          color={severity}
          onClickAriaLabel={numberOfAlertsLabel(list.length)}
          onClick={() => setShowPopover(severity)}
        >
          {numberOfAlertsLabel(list.length)}
        </EuiBadge>
      );

      const typesGrouped: { [type: string]: AlertStatusAndState[] } = {};
      for (const asas of list) {
        typesGrouped[asas.alert.alert.type] = typesGrouped[asas.alert.alert.type] || [];
        typesGrouped[asas.alert.alert.type].push(asas);
      }
      const totalGroups = Object.keys(typesGrouped).length;

      const panels = [
        {
          id: 0,
          title: `Alerts`,
          items: Object.keys(typesGrouped).map((type, index) => {
            const sample = typesGrouped[type][0];
            return {
              name: (
                <EuiTextColor color={sample.alertState.state.ui.severity}>
                  {sample.alert.alert.label} ({typesGrouped[type].length})
                </EuiTextColor>
              ),
              panel: index + 1,
            };
          }),
        },
        ...Object.keys(typesGrouped).map((type, index) => {
          const sample = typesGrouped[type][0];
          const listToShow =
            viewMoreUrl && typesGrouped[type].length > MAX_TO_SHOW_IN_LIST
              ? typesGrouped[type].slice(0, MAX_TO_SHOW_IN_LIST)
              : typesGrouped[type];

          const items: AlertPanelItem[] = listToShow.reduce(
            (alertPanelItems: AlertPanelItem[], { alert, alertState }, itemIndex) => {
              alertPanelItems.push({
                name: (
                  <Fragment>
                    <EuiText size="s">
                      <h4>{alertState.state.stackProductName}</h4>
                    </EuiText>
                    <EuiText size="s">
                      <h5>{getDateFromState(alertState)}</h5>
                    </EuiText>
                  </Fragment>
                ),
                panel: totalGroups + itemIndex + 1,
              });
              alertPanelItems.push({
                isSeparator: true,
              });
              return alertPanelItems;
            },
            []
          );

          if (viewMoreUrl && list.length > MAX_TO_SHOW_IN_LIST) {
            items.push({
              name: (
                <EuiLink href={viewMoreUrl}>
                  {i18n.translate('xpack.monitoring.alerts.badge.viewMore', {
                    defaultMessage: 'View more',
                  })}
                </EuiLink>
              ),
            });
          }

          return {
            id: index + 1,
            title: sample.alert.alert.label,
            items,
          };
        }),
        ...Object.keys(typesGrouped).reduce((alertPanels: any, type, index) => {
          const listToShow =
            typesGrouped[type].length > MAX_TO_SHOW_IN_LIST
              ? typesGrouped[type].slice(0, MAX_TO_SHOW_IN_LIST)
              : typesGrouped[type];

          alertPanels.push(
            ...listToShow.map((alertStatus, alertIndex) => {
              return {
                id: totalGroups + alertIndex + 1,
                title: alertStatus.alertState.state.stackProductName,
                width: 400,
                content: (
                  <AlertPanel
                    alert={alertStatus.alert}
                    alertState={alertStatus.alertState}
                    nextStepsFilter={nextStepsFilter}
                  />
                ),
              };
            })
          );
          return alertPanels;
        }, []),
      ];

      badges.push(
        <EuiPopover
          id="monitoringAlertMenu"
          button={button}
          isOpen={showPopover === severity}
          closePopover={() => setShowPopover(null)}
          panelPaddingSize="none"
          anchorPosition="downLeft"
        >
          <EuiContextMenu initialPanelId={0} panels={panels} />
        </EuiPopover>
      );
    }
  }

  return (
    <Fragment>
      <EuiFlexGrid data-test-subj="monitoringSetupModeAlertBadges">
        {badges.map((badge, index) => (
          <EuiFlexItem key={index} grow={false}>
            {badge}
          </EuiFlexItem>
        ))}
      </EuiFlexGrid>
    </Fragment>
  );
};
