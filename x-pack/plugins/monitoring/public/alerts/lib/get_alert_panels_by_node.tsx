/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { Fragment } from 'react';
import { EuiText, EuiSwitch } from '@elastic/eui';
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
  setShowByNode: (value: boolean) => void,
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
  const nodes: { [uuid: string]: CommonAlertState[] } = alerts.reduce(
    (accum: { [uuid: string]: CommonAlertState[] }, alert) => {
      for (const alertState of alert.states.filter(
        ({ firing, state }) => firing && stateFilter(state)
      )) {
        accum[alertState.state.stackProductUuid] = accum[alertState.state.stackProductUuid] || [];
        accum[alertState.state.stackProductUuid].push(alertState);
        alertsByNodes[alertState.state.stackProductUuid] =
          alertsByNodes[alertState.state.stackProductUuid] || {};
        alertsByNodes[alertState.state.stackProductUuid][alert.alert.type] = alertsByNodes[
          alertState.state.stackProductUuid
        ][alert.alert.type] || { alert: alert.alert, states: [], count: 0 };
        alertsByNodes[alertState.state.stackProductUuid][alert.alert.type].count++;
        alertsByNodes[alertState.state.stackProductUuid][alert.alert.type].states.push(alertState);
      }
      return accum;
    },
    {}
  );

  const nodeCount = Object.keys(nodes).length;
  const panels: PanelItem[] = [
    {
      id: 0,
      title: panelTitle,
      items: [
        ...Object.keys(nodes).map((nodeUuid, index) => {
          const states = nodes[nodeUuid] as CommonAlertState[];

          return {
            name: (
              <EuiText>
                {states[0].state.stackProductName} ({states.length})
              </EuiText>
            ),
            panel: index + 1,
          };
        }),
        {
          isSeparator: true,
        },
        {
          name: (
            <EuiSwitch
              checked={false}
              onChange={() => setShowByNode(false)}
              label="Group by alert type"
            />
          ),
        },
      ],
    },
    ...Object.keys(nodes).reduce((accum: PanelItem[], nodeUuid, index) => {
      const alertsForNode = Object.values(alertsByNodes[nodeUuid]);
      for (const alertStateByNode of nodes[nodeUuid]) {
        const panelItems = [];
        for (const [alertsForNodeIndex, { alert, states }] of alertsForNode.entries()) {
          for (const [stateIndex, alertState] of states.entries()) {
            const panel =
              nodeCount + nodes[nodeUuid].length + alertsForNodeIndex + stateIndex + index;
            panelItems.push({
              name: (
                <Fragment>
                  <EuiText size="s">{getFormattedDateForAlertState(alertState)}</EuiText>
                  <EuiText size="s">{alert.label}</EuiText>
                  <EuiText size="s">{alertState.state.stackProductName}</EuiText>
                </Fragment>
              ),
              panel,
            });
          }
        }
        accum.push({
          id: index + 1,
          title: alertStateByNode.state.stackProductName,
          items: panelItems,
        });
      }
      return accum;
    }, []),
    ...Object.keys(nodes).reduce((accum: PanelItem[], nodeUuid, index) => {
      const alertsForNode = Object.values(alertsByNodes[nodeUuid]);
      for (const [alertsForNodeIndex, { alert, states }] of alertsForNode.entries()) {
        for (const [stateIndex, alertState] of states.entries()) {
          const panel =
            nodeCount + nodes[nodeUuid].length + alertsForNodeIndex + stateIndex + index;
          accum.push({
            id: panel,
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
