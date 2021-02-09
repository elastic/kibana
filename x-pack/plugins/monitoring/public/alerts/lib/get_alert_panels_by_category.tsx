/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Fragment } from 'react';
import { EuiText, EuiToolTip } from '@elastic/eui';
import { AlertPanel } from '../panel';
import { ALERT_PANEL_MENU } from '../../../common/constants';
import { getDateFromNow, getCalendar } from '../../../common/formatting';
import { IAlertsContext } from '../context';
import { AlertState, CommonAlertStatus } from '../../../common/types/alerts';
import { PanelItem } from '../types';
import { sortByNewestAlert } from './sort_by_newest_alert';
import { Legacy } from '../../legacy_shims';

export function getAlertPanelsByCategory(
  panelTitle: string,
  inSetupMode: boolean,
  alerts: CommonAlertStatus[],
  alertsContext: IAlertsContext,
  stateFilter: (state: AlertState) => boolean
) {
  const menu = [];
  for (const category of ALERT_PANEL_MENU) {
    let categoryFiringAlertCount = 0;
    if (inSetupMode) {
      const alertsInCategory = [];
      for (const categoryAlert of category.alerts) {
        if (
          Boolean(alerts.find(({ rawAlert }) => rawAlert.alertTypeId === categoryAlert.alertName))
        ) {
          alertsInCategory.push(categoryAlert);
        }
      }
      if (alertsInCategory.length > 0) {
        menu.push({
          ...category,
          alerts: alertsInCategory.map(({ alertName }) => {
            const alertStatus = alertsContext.allAlerts[alertName];
            return {
              alert: alertStatus.rawAlert,
              states: [],
              alertName,
            };
          }),
          alertCount: 0,
        });
      }
    } else {
      const firingAlertsInCategory = [];
      for (const { alertName } of category.alerts) {
        const foundAlert = alerts.find(
          ({ rawAlert: { alertTypeId } }) => alertName === alertTypeId
        );
        if (foundAlert && foundAlert.states.length > 0) {
          const states = foundAlert.states.filter(({ state }) => stateFilter(state));
          if (states.length > 0) {
            firingAlertsInCategory.push({
              alert: foundAlert.rawAlert,
              states: foundAlert.states,
              alertName,
            });
            categoryFiringAlertCount += states.length;
          }
        }
      }

      if (firingAlertsInCategory.length > 0) {
        menu.push({
          ...category,
          alertCount: categoryFiringAlertCount,
          alerts: firingAlertsInCategory,
        });
      }
    }
  }

  for (const item of menu) {
    for (const alert of item.alerts) {
      alert.states.sort(sortByNewestAlert);
    }
  }

  const panels: PanelItem[] = [
    {
      id: 0,
      title: panelTitle,
      items: [
        ...menu.map((category, index) => {
          const name = inSetupMode ? (
            <EuiText>{category.label}</EuiText>
          ) : (
            <Fragment>
              <EuiText>
                {category.label} ({category.alertCount})
              </EuiText>
            </Fragment>
          );
          return {
            name,
            panel: index + 1,
          };
        }),
      ],
    },
  ];

  if (inSetupMode) {
    let secondaryPanelIndex = menu.length;
    let tertiaryPanelIndex = menu.length;
    let nodeIndex = 0;
    for (const category of menu) {
      panels.push({
        id: nodeIndex + 1,
        title: `${category.label}`,
        items: category.alerts.map(({ alertName }) => {
          const alertStatus = alertsContext.allAlerts[alertName];
          return {
            name: <EuiText>{alertStatus.rawAlert.name}</EuiText>,
            panel: ++secondaryPanelIndex,
          };
        }),
      });
      nodeIndex++;
    }

    for (const category of menu) {
      for (const { alert, alertName } of category.alerts) {
        const alertStatus = alertsContext.allAlerts[alertName];
        panels.push({
          id: ++tertiaryPanelIndex,
          title: `${alert.name}`,
          width: 400,
          content: <AlertPanel alert={alertStatus.rawAlert} />,
        });
      }
    }
  } else {
    let primaryPanelIndex = menu.length;
    let nodeIndex = 0;
    for (const category of menu) {
      panels.push({
        id: nodeIndex + 1,
        title: `${category.label}`,
        items: category.alerts.map(({ alertName, states }) => {
          const filteredStates = states.filter(({ state }) => stateFilter(state));
          const alertStatus = alertsContext.allAlerts[alertName];
          const name = inSetupMode ? (
            <EuiText>{alertStatus.rawAlert.name}</EuiText>
          ) : (
            <EuiText>
              {alertStatus.rawAlert.name} ({filteredStates.length})
            </EuiText>
          );
          return {
            name,
            panel: ++primaryPanelIndex,
          };
        }),
      });
      nodeIndex++;
    }

    let secondaryPanelIndex = menu.length;
    let tertiaryPanelIndex = menu.reduce((count, category) => {
      count += category.alerts.length;
      return count;
    }, menu.length);
    for (const category of menu) {
      for (const { alert, states } of category.alerts) {
        const items = [];
        for (const alertState of states.filter(({ state }) => stateFilter(state))) {
          const { nodeName, itemLabel } = alertState.state;
          items.push({
            name: (
              <Fragment>
                <EuiToolTip
                  position="top"
                  content={getCalendar(
                    alertState.state.ui.triggeredMS,
                    Legacy.shims.uiSettings.get('dateFormat:tz')
                  )}
                >
                  <EuiText size="s">
                    {getDateFromNow(
                      alertState.state.ui.triggeredMS,
                      Legacy.shims.uiSettings.get('dateFormat:tz')
                    )}
                  </EuiText>
                </EuiToolTip>
                <EuiText size="s">{nodeName || itemLabel}</EuiText>
              </Fragment>
            ),
            panel: ++tertiaryPanelIndex,
          });
          items.push({
            isSeparator: true as const,
          });
        }

        panels.push({
          id: ++secondaryPanelIndex,
          title: `${alert.name}`,
          items,
        });
      }
    }

    let tertiaryPanelIndex2 = menu.reduce((count, category) => {
      count += category.alerts.length;
      return count;
    }, menu.length);
    for (const category of menu) {
      for (const { alert, states } of category.alerts) {
        for (const state of states.filter(({ state: _state }) => stateFilter(_state))) {
          panels.push({
            id: ++tertiaryPanelIndex2,
            title: `${alert.name}`,
            width: 400,
            content: <AlertPanel alert={alert} alertState={state} />,
          });
        }
      }
    }
  }

  return panels;
}
