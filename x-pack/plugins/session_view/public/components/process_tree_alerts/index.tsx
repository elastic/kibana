/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, MouseEvent } from 'react';
import { useStyles } from './styles';
import { ProcessEvent, ProcessEventAlert } from '../../../common/types/process_tree';
import { ProcessTreeAlert } from '../process_tree_alert';
import { MOUSE_EVENT_PLACEHOLDER } from '../../../common/constants';

interface ProcessTreeAlertsDeps {
  alerts: ProcessEvent[];
  jumpToAlertID?: string;
  isProcessSelected?: boolean;
  onAlertSelected: (e: MouseEvent) => void;
}

export function ProcessTreeAlerts({
  alerts,
  jumpToAlertID,
  isProcessSelected = false,
  onAlertSelected,
}: ProcessTreeAlertsDeps) {
  const styles = useStyles();
  const [selectedAlert, setSelectedAlert] = useState<ProcessEventAlert | null>(null);

  if (alerts.length === 0) {
    return null;
  }

  const handleAlertClick = (alert: ProcessEventAlert | null) => {
    onAlertSelected(MOUSE_EVENT_PLACEHOLDER);
    setSelectedAlert(alert);
  };

  return (
    <div css={styles.container} data-test-subj="sessionView:sessionViewAlertDetails">
      {alerts.map((alert: ProcessEvent) => {
        const alertUuid = alert.kibana?.alert.uuid || null;

        return (
          <ProcessTreeAlert
            alert={alert}
            isInvestigated={jumpToAlertID === alertUuid}
            isSelected={isProcessSelected && selectedAlert?.uuid === alertUuid}
            onClick={handleAlertClick}
          />
        );
      })}
    </div>
  );
}
