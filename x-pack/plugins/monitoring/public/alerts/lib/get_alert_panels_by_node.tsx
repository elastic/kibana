/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { Fragment } from 'react';
import { EuiText } from '@elastic/eui';
import { AlertPanel } from '../panel';
import {
  AlertMessage,
  CommonAlertStatus,
  CommonBaseAlert,
  CommonAlertState,
  AlertState,
} from '../../../common/types/alerts';
import { PanelItem } from '../types';
import { getFormattedDateForAlertState } from './get_formatted_date_for_alert_state';

export function getAlertPanelsByNode(
  panelTitle: string,
  alerts: CommonAlertStatus[],
  stateFilter: (state: AlertState) => boolean,
  nextStepsFilter: (nextStep: AlertMessage) => boolean
) {
  const alertsByNodes: {
    [uuid: string]: {
      [alertName: string]: {
        alert: CommonBaseAlert;
        states: CommonAlertState[];
        count: number;
      };
    };
  } = {};
  const statesByNodes: {
    [uuid: string]: CommonAlertState[];
  } = {};

  for (const { states, alert } of alerts) {
    const { type } = alert;
    for (const alertState of states.filter(
      ({ firing, state: _state }) => firing && stateFilter(_state)
    )) {
      const { state } = alertState;
      statesByNodes[state.stackProductUuid] = statesByNodes[state.stackProductUuid] || [];
      statesByNodes[state.stackProductUuid].push(alertState);

      alertsByNodes[state.stackProductUuid] = alertsByNodes[state.stackProductUuid] || {};
      alertsByNodes[state.stackProductUuid][type] = alertsByNodes[
        alertState.state.stackProductUuid
      ][type] || { alert, states: [], count: 0 };
      alertsByNodes[state.stackProductUuid][type].count++;
      alertsByNodes[state.stackProductUuid][type].states.push(alertState);
    }
  }

  const nodeCount = Object.keys(statesByNodes).length;
  let secondaryPanelIndex = nodeCount;
  let tertiaryPanelIndex = nodeCount;
  const panels: PanelItem[] = [
    {
      id: 0,
      title: panelTitle,
      items: [
        ...Object.keys(statesByNodes).map((nodeUuid, index) => {
          const firingStates = (statesByNodes[nodeUuid] as CommonAlertState[]).filter(
            ({ state, firing }) => firing && stateFilter(state)
          );

          return {
            name: (
              <EuiText>
                {firingStates[0].state.stackProductName} ({firingStates.length})
              </EuiText>
            ),
            panel: index + 1,
          };
        }),
      ],
    },
    ...Object.keys(statesByNodes).reduce((accum: PanelItem[], nodeUuid, nodeIndex) => {
      const alertsForNode = Object.values(alertsByNodes[nodeUuid]);
      const panelItems = [];
      let title = '';
      for (const { alert, states } of alertsForNode) {
        for (const alertState of states) {
          title = alertState.state.stackProductName;
          panelItems.push({
            name: (
              <Fragment>
                <EuiText size="s">{getFormattedDateForAlertState(alertState)}</EuiText>
                <EuiText size="s">{alert.label}</EuiText>
                <EuiText size="s">{alertState.state.stackProductName}</EuiText>
              </Fragment>
            ),
            panel: ++secondaryPanelIndex,
          });
        }
      }
      accum.push({
        id: nodeIndex + 1,
        title,
        items: panelItems,
      });
      return accum;
    }, []),
    ...Object.keys(statesByNodes).reduce((accum: PanelItem[], nodeUuid, nodeIndex) => {
      const alertsForNode = Object.values(alertsByNodes[nodeUuid]);
      for (const { alert, states } of alertsForNode) {
        for (const alertState of states) {
          accum.push({
            id: ++tertiaryPanelIndex,
            title: alert.label,
            width: 400,
            content: (
              <AlertPanel alert={alert} alertState={alertState} nextStepsFilter={nextStepsFilter} />
            ),
          });
        }
      }
      return accum;
    }, []),
  ];

  return panels;
}
