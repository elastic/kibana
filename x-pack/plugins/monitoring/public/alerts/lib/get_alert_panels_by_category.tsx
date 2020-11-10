/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { Fragment } from 'react';
import { EuiText } from '@elastic/eui';
import { AlertPanel } from '../panel';
import { ALERT_PANEL_MENU } from '../../../common/constants';
import { IAlertsContext } from '../context';
import { AlertMessage, AlertState, CommonAlertStatus } from '../../../common/types/alerts';
import { PanelItem } from '../types';
import { getFormattedDateForAlertState } from './get_formatted_date_for_alert_state';

export function getAlertPanelsByCategory(
  panelTitle: string,
  inSetupMode: boolean,
  alerts: CommonAlertStatus[],
  alertsContext: IAlertsContext,
  stateFilter: (state: AlertState) => boolean,
  nextStepsFilter: (nextStep: AlertMessage) => boolean
) {
  const menu = [];
  for (const category of ALERT_PANEL_MENU) {
    let categoryFiringAlertCount = 0;
    if (inSetupMode) {
      const alertsInCategory = [];
      for (const categoryAlert of category.alerts) {
        if (alertsContext.allAlerts[categoryAlert.alertName]) {
          alertsInCategory.push(categoryAlert);
        }
      }
      if (alertsInCategory.length > 0) {
        menu.push({
          ...category,
          alerts: alertsInCategory.map(({ alertName, panelIndex }) => {
            const alertStatus = alertsContext.allAlerts[alertName];
            return {
              alert: alertStatus.alert,
              firingStates: [],
              alertName,
              panelIndex,
            };
          }),
          alertCount: 0,
        });
      }
    } else {
      const firingAlertsInCategory = [];
      for (const { alertName, panelIndex } of category.alerts) {
        const foundAlert = alerts.find(({ alert: { type } }) => alertName === type);
        if (foundAlert && foundAlert.states.length > 0) {
          const firingStates = foundAlert.states.filter(
            (state) => state.firing && stateFilter(state.state)
          );
          if (firingStates.length > 0) {
            firingAlertsInCategory.push({
              alert: foundAlert.alert,
              firingStates,
              alertName,
              panelIndex,
            });
            categoryFiringAlertCount += firingStates.length;
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
    ...menu.map((category, index) => {
      return {
        id: index + 1,
        title: `${category.label}`,
        items: category.alerts.map(({ alertName }, panelIndex) => {
          const alertStatus = alertsContext.allAlerts[alertName];
          const name = inSetupMode ? (
            <EuiText>{alertStatus.alert.label}</EuiText>
          ) : (
            <EuiText>
              {alertStatus.alert.label} ({category.alertCount})
            </EuiText>
          );
          return {
            name,
            panel: menu.length + panelIndex + 1,
          };
        }),
      };
    }),
  ];

  if (inSetupMode) {
    panels.push(
      ...menu.reduce((accum: PanelItem[], category) => {
        for (const { alert, panelIndex, alertName } of category.alerts) {
          const alertStatus = alertsContext.allAlerts[alertName];
          accum.push({
            id: menu.length + panelIndex,
            title: `${alert.label}`,
            width: 400,
            content: <AlertPanel alert={alertStatus.alert} nextStepsFilter={nextStepsFilter} />,
          });
        }
        return accum;
      }, [])
    );
  } else {
    for (const category of menu) {
      let panelIndex = 1;
      let secondaryPanelIndex = menu.length + category.alerts.length;
      for (const { alert, firingStates } of category.alerts) {
        const items = [];
        for (const alertState of firingStates) {
          items.push({
            name: (
              <Fragment>
                <EuiText size="s">{getFormattedDateForAlertState(alertState)}</EuiText>
                <EuiText size="s">{alert.label}</EuiText>
                <EuiText size="s">{alertState.state.stackProductName}</EuiText>
              </Fragment>
            ),
            panel: ++secondaryPanelIndex,
          });
          items.push({
            isSeparator: true as const,
          });
        }

        panels.push({
          id: menu.length + panelIndex++,
          title: `${alert.label}`,
          items,
        });
      }
    }

    for (const category of menu) {
      let tertiaryPanelIndex = menu.length + category.alerts.length;
      for (const { alert, firingStates } of category.alerts) {
        for (const state of firingStates) {
          panels.push({
            id: ++tertiaryPanelIndex,
            title: `${alert.label}`,
            width: 400,
            content: (
              <AlertPanel alert={alert} alertState={state} nextStepsFilter={nextStepsFilter} />
            ),
          });
        }
      }
    }
  }

  return panels;
}
