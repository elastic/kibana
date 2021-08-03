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
import {
  AlertState,
  CommonAlert,
  CommonAlertState,
  CommonAlertStatus,
} from '../../../common/types/alerts';
import { PanelItem } from '../types';
import { sortByNewestAlert } from './sort_by_newest_alert';
import { Legacy } from '../../legacy_shims';

interface MenuAlert {
  alert: CommonAlert;
  alertName: string;
  states: CommonAlertState[];
}
interface MenuItem {
  alertCount: number;
  label: string;
  alerts: MenuAlert[];
}
export function getAlertPanelsByCategory(
  panelTitle: string,
  inSetupMode: boolean,
  alerts: CommonAlertStatus[],
  stateFilter: (state: AlertState) => boolean
) {
  // return items organized by categories in ALERT_PANEL_MENU
  // only show rules in setup mode
  const menu = inSetupMode
    ? ALERT_PANEL_MENU.reduce<MenuItem[]>((acc, category) => {
        // check if we have any rules with that match this category
        const alertsInCategory = category.alerts.filter((alert) =>
          alerts.find(({ rawAlert }) => rawAlert.alertTypeId === alert.alertName)
        );
        // return all the categories that have rules and the rules
        if (alertsInCategory.length > 0) {
          // add the category item to the menu
          acc.push({
            ...category,
            // add the corresponding rules that belong to this category
            alerts: alertsInCategory
              .map(({ alertName }) => {
                return alerts
                  .filter(({ rawAlert }) => rawAlert.alertTypeId === alertName)
                  .map((alert) => {
                    return {
                      alert: alert.rawAlert,
                      states: [],
                      alertName,
                    };
                  });
              })
              .flat(),
            alertCount: 0,
          });
        }
        return acc;
      }, [])
    : ALERT_PANEL_MENU.reduce<MenuItem[]>((acc, category) => {
        // return items organized by categories in ALERT_PANEL_MENU, then rule name, then the actual alerts
        const firingAlertsInCategory: MenuAlert[] = [];
        let categoryFiringAlertCount = 0;
        for (const { alertName } of category.alerts) {
          const foundAlerts = alerts.filter(
            ({ rawAlert, states }) => alertName === rawAlert.alertTypeId && states.length > 0
          );
          if (foundAlerts.length > 0) {
            foundAlerts.forEach((foundAlert) => {
              // add corresponding alerts to each rule
              const states = foundAlert.states.filter(({ state }) => stateFilter(state));
              if (states.length > 0) {
                firingAlertsInCategory.push({
                  alert: foundAlert.rawAlert,
                  states,
                  alertName,
                });
                categoryFiringAlertCount += states.length;
              }
            });
          }
        }

        if (firingAlertsInCategory.length > 0) {
          acc.push({
            ...category,
            alertCount: categoryFiringAlertCount,
            alerts: firingAlertsInCategory,
          });
        }
        return acc;
      }, []);

  for (const item of menu) {
    for (const alert of item.alerts) {
      alert.states.sort(sortByNewestAlert);
    }
  }
  // if in setup mode add the count of alerts to the category name
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
    // create the nested UI menu: category name -> rule name -> edit rule
    let secondaryPanelIndex = menu.length;
    let tertiaryPanelIndex = menu.length;
    let nodeIndex = 0;
    for (const category of menu) {
      panels.push({
        id: nodeIndex + 1,
        title: `${category.label}`,
        items: category.alerts
          .map((alert) => {
            return {
              name: <EuiText>{alert.alert.name}</EuiText>,
              panel: ++secondaryPanelIndex,
            };
          })
          .flat(),
      });
      nodeIndex++;
    }
    for (const category of menu) {
      for (const { alert } of category.alerts) {
        panels.push({
          id: ++tertiaryPanelIndex,
          title: `${alert.name}`,
          width: 400,
          content: <AlertPanel alert={alert} />,
        });
      }
    }
  } else {
    // create the nested UI menu: category name (n) -> rule name (n) -> list of firing alerts
    let primaryPanelIndex = menu.length;
    let nodeIndex = 0;
    for (const category of menu) {
      panels.push({
        id: nodeIndex + 1,
        title: `${category.label}`,
        items: category.alerts.map(({ alert, alertName, states }) => {
          const filteredStates = states.filter(({ state }) => stateFilter(state));
          const name = inSetupMode ? (
            <EuiText>{alert.name}</EuiText>
          ) : (
            <EuiText>
              {alert.name} ({filteredStates.length})
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
