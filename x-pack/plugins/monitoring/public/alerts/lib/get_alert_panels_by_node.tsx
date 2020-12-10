/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { Fragment } from 'react';
import { EuiText } from '@elastic/eui';
import { AlertPanel } from '../panel';
import { CommonAlertStatus, CommonAlertState, CommonAlert } from '../../../common/types/alerts';
import { getCalendar } from '../../../common/formatting';
import { PanelItem } from '../types';
import { sortByNewestAlert } from './sort_by_newest_alert';
import { Legacy } from '../../legacy_shims';

export function getAlertPanelsByNode(panelTitle: string, alerts: CommonAlertStatus[]) {
  const alertsByNodes: {
    [uuid: string]: {
      [alertName: string]: {
        alert: CommonAlert;
        states: CommonAlertState[];
        count: number;
      };
    };
  } = {};
  const statesByNodes: {
    [uuid: string]: CommonAlertState[];
  } = {};

  for (const { states, rawAlert } of alerts) {
    const { alertTypeId } = rawAlert;
    for (const alertState of states) {
      const { state } = alertState;
      statesByNodes[state.stackProductUuid] = statesByNodes[state.stackProductUuid] || [];
      statesByNodes[state.stackProductUuid].push(alertState);

      alertsByNodes[state.stackProductUuid] = alertsByNodes[state.stackProductUuid] || {};
      alertsByNodes[state.stackProductUuid][alertTypeId] = alertsByNodes[
        alertState.state.stackProductUuid
      ][alertTypeId] || { alert: rawAlert, states: [], count: 0 };
      alertsByNodes[state.stackProductUuid][alertTypeId].count++;
      alertsByNodes[state.stackProductUuid][alertTypeId].states.push(alertState);
    }
  }

  for (const types of Object.values(alertsByNodes)) {
    for (const { states } of Object.values(types)) {
      states.sort(sortByNewestAlert);
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
          const states = statesByNodes[nodeUuid] as CommonAlertState[];
          return {
            name: (
              <EuiText>
                {states[0].state.stackProductName} ({states.length})
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
                <EuiText size="s">
                  {getCalendar(
                    alertState.state.ui.triggeredMS,
                    Legacy.shims.uiSettings.get('dateFormat:tz')
                  )}
                </EuiText>
                <EuiText size="s">{alert.name}</EuiText>
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
            title: alert.name,
            width: 400,
            content: <AlertPanel alert={alert} alertState={alertState} />,
          });
        }
      }
      return accum;
    }, []),
  ];

  return panels;
}
