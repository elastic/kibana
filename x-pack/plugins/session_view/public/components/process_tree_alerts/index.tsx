/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useEffect, useRef, MouseEvent, useCallback } from 'react';
import { useStyles } from './styles';
import { ProcessEvent, ProcessEventAlert } from '../../../common/types/process_tree';
import { ProcessTreeAlert } from '../process_tree_alert';
import { MOUSE_EVENT_PLACEHOLDER } from '../../../common/constants';

export interface ProcessTreeAlertsDeps {
  alerts: ProcessEvent[];
  investigatedAlertId?: string;
  isProcessSelected?: boolean;
  onAlertSelected: (e: MouseEvent) => void;
  onShowAlertDetails: (alertUuid: string) => void;
}

export function ProcessTreeAlerts({
  alerts,
  investigatedAlertId,
  isProcessSelected = false,
  onAlertSelected,
  onShowAlertDetails,
}: ProcessTreeAlertsDeps) {
  const [selectedAlert, setSelectedAlert] = useState<ProcessEventAlert | null>(null);
  const styles = useStyles();

  useEffect(() => {
    const jumpToAlert = alerts.find((alert) => alert.kibana?.alert.uuid === investigatedAlertId);
    if (investigatedAlertId && jumpToAlert) {
      setSelectedAlert(jumpToAlert.kibana?.alert!);
    }
  }, [investigatedAlertId, alerts]);

  const scrollerRef = useRef<HTMLDivElement>(null);

  const selectAlert = useCallback((alertUuid: string) => {
    if (!scrollerRef?.current) {
      return;
    }

    const alertEl = scrollerRef.current.querySelector<HTMLElement>(`[data-id="${alertUuid}"]`);

    if (alertEl) {
      const cTop = scrollerRef.current.scrollTop;
      const cBottom = cTop + scrollerRef.current.clientHeight;

      const eTop = alertEl.offsetTop;
      const eBottom = eTop + alertEl.clientHeight;
      const isVisible = eTop >= cTop && eBottom <= cBottom;

      if (!isVisible) {
        alertEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }, []);

  const handleAlertClick = useCallback(
    (alert: ProcessEventAlert | null) => {
      onAlertSelected(MOUSE_EVENT_PLACEHOLDER);
      setSelectedAlert(alert);
    },
    [onAlertSelected]
  );

  if (alerts.length === 0) {
    return null;
  }

  return (
    <div
      ref={scrollerRef}
      css={styles.container}
      data-test-subj="sessionView:sessionViewAlertDetails"
    >
      {alerts.map((alert: ProcessEvent, idx: number) => {
        const alertUuid = alert.kibana?.alert.uuid || null;

        return (
          <ProcessTreeAlert
            key={`${alertUuid}-${idx}`}
            alert={alert}
            isInvestigated={investigatedAlertId === alertUuid}
            isSelected={isProcessSelected && selectedAlert?.uuid === alertUuid}
            onClick={handleAlertClick}
            selectAlert={selectAlert}
            onShowAlertDetails={onShowAlertDetails}
          />
        );
      })}
    </div>
  );
}
