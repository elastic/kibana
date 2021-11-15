/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as React from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { EditMonitor } from './edit_monitor';
import { DeleteMonitor } from './delete_monitor';
import { MonitorSavedObject } from '../../../../../common/types';

interface Props {
  monitorId: string;
  monitorListObjects: MonitorSavedObject[];
}
export const getMonitorObject = (monitorId: string, monitorListObjects: MonitorSavedObject[]) => {
  return monitorListObjects?.find(({ id }) => monitorId.includes(id));
};
export const ListActions = ({ monitorId, monitorListObjects }: Props) => {
  const objMonitor = getMonitorObject(monitorId, monitorListObjects);

  if (!objMonitor) {
    return null;
  }
  return (
    <EuiFlexGroup gutterSize="xs">
      <EuiFlexItem>
        <EditMonitor monitor={objMonitor} />
      </EuiFlexItem>
      <EuiFlexItem>
        <DeleteMonitor monitorId={objMonitor.id} />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
