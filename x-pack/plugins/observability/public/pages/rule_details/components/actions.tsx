/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiText, EuiSpacer, EuiFlexGroup, EuiFlexItem, EuiIcon, IconType } from '@elastic/eui';
import { ActionsProps } from '../types';

interface MapActionTypeIcon {
  [key: string]: string | IconType;
}
const mapActionTypeIcon: MapActionTypeIcon = {
  /* TODO:  Add the rest of the application logs (SVGs ones) */
  '.server-log': 'logsApp',
  '.email': 'email',
  '.pagerduty': 'apps',
  '.index': 'indexOpen',
  '.slack': 'logoSlack',
  '.webhook': 'logoWebhook',
};
export function Actions({ actions }: ActionsProps) {
  if (actions && actions.length <= 0) return <EuiText size="m">0</EuiText>;

  const uniqueActions = Array.from(new Set(actions.map((action: any) => action.actionTypeId)));
  return (
    <EuiFlexGroup direction="column">
      {uniqueActions.map((actionTypeId) => (
        <>
          <EuiFlexGroup alignItems="flexStart">
            <EuiFlexItem grow={false}>
              <EuiIcon size="l" type={mapActionTypeIcon[actionTypeId] ?? 'apps'} />
            </EuiFlexItem>
            <EuiFlexItem>
              {/* TODO: Get the user-typed connector name?  */}
              <EuiText size="m">{actionTypeId}</EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiSpacer size="s" />
        </>
      ))}
    </EuiFlexGroup>
  );
}
