/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useStyles } from './styles';
import { ProcessEvent, ProcessEventAlert } from '../../../common/types/process_tree';
import { ProcessTreeAlert } from '../process_tree_alert';

interface ProcessTreeAlertsDeps {
  alerts: ProcessEvent[];
  jumpToAlertID?: string;
  selectedAlert: ProcessEventAlert | null;
  onAlertSelected: (alert: ProcessEventAlert | null) => void;
}

export function ProcessTreeAlerts({
  alerts,
  jumpToAlertID,
  selectedAlert,
  onAlertSelected,
}: ProcessTreeAlertsDeps) {
  const styles = useStyles();

  if (alerts.length === 0) {
    return null;
  }

  return (
    <div css={styles.container} data-test-subj="sessionView:sessionViewAlertDetails">
      {alerts.map((alert: ProcessEvent) => (
        <ProcessTreeAlert
          alert={alert}
          isInvestigated={!!jumpToAlertID && jumpToAlertID === alert.kibana?.alert.uuid}
          isSelected={!!selectedAlert?.uuid && alert.kibana?.alert.uuid === selectedAlert?.uuid}
          onAlertSelected={onAlertSelected}
        />
      ))}
    </div>
  );
}
