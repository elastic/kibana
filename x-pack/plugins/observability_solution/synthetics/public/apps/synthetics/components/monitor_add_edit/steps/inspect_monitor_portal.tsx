/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { InPortal } from 'react-reverse-portal';
import { SyntheticsMonitor } from '../../../../../../common/runtime_types';
import { MonitorInspectWrapper } from '../../common/components/monitor_inspect';
import { InspectMonitorPortalNode } from '../portals';

export const InspectMonitorPortal = ({
  isValid,
  monitorFields,
}: {
  isValid: boolean;
  monitorFields: SyntheticsMonitor;
}) => {
  return (
    <InPortal node={InspectMonitorPortalNode}>
      <MonitorInspectWrapper isValid={isValid} monitorFields={monitorFields} />
    </InPortal>
  );
};
