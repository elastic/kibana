/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useEffect, useRef, MouseEvent, useCallback, useMemo } from 'react';
import { useStyles } from './styles';
import {
  ProcessEventAlertCategory,
  DefaultAlertFilterType,
  ProcessEvent,
  ProcessEventAlert,
  AlertTypeCount,
} from '../../../common/types/process_tree';
import { ProcessTreeAlert } from '../process_tree_alert';
import { DEFAULT_ALERT_FILTER_VALUE, MOUSE_EVENT_PLACEHOLDER } from '../../../common/constants';
import { ProcessTreeAlertsFilter } from '../process_tree_alerts_filter';

export interface ProcessTreeAlertsDeps {
  alerts: ProcessEvent[];
  investigatedAlertId?: string;
  isProcessSelected?: boolean;
  alertTypeCounts: AlertTypeCount[];
  onAlertSelected: (e: MouseEvent) => void;
  onShowAlertDetails: (alertUuid: string) => void;
}

export function ProcessTreeAlerts({
  alerts,
  investigatedAlertId,
  isProcessSelected = false,
  alertTypeCounts,
  onAlertSelected,
  onShowAlertDetails,
}: ProcessTreeAlertsDeps) {
  const [selectedAlert, setSelectedAlert] = useState<ProcessEventAlert | null>(null);
  const [selectedProcessEventAlertCategory, setSelectedProcessEventAlertCategory] = useState<
    ProcessEventAlertCategory | DefaultAlertFilterType
  >(DEFAULT_ALERT_FILTER_VALUE);
  const styles = useStyles();

  useEffect(() => {
    const jumpToAlert =
      investigatedAlertId &&
      alerts.find((alert) => alert.kibana?.alert?.uuid === investigatedAlertId);

    if (jumpToAlert) {
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

  const handleProcessEventAlertCategorySelected = useCallback((eventCategory) => {
    if (ProcessEventAlertCategory.hasOwnProperty(eventCategory)) {
      setSelectedProcessEventAlertCategory(eventCategory);
    } else {
      setSelectedProcessEventAlertCategory(ProcessEventAlertCategory.all);
    }
  }, []);

  const filteredProcessEventAlerts = useMemo(() => {
    return alerts?.filter((processEventAlert: ProcessEvent) => {
      const processEventAlertCategory = processEventAlert.event?.category?.[0];
      if (selectedProcessEventAlertCategory === DEFAULT_ALERT_FILTER_VALUE) {
        return true;
      }
      return processEventAlertCategory === selectedProcessEventAlertCategory;
    });
  }, [selectedProcessEventAlertCategory, alerts]);

  if (alerts.length === 0) {
    return null;
  }

  return (
    <div
      ref={scrollerRef}
      css={styles.container}
      data-test-subj="sessionView:sessionViewAlertDetails"
    >
      <ProcessTreeAlertsFilter
        totalAlertsCount={alerts.length}
        alertTypeCounts={alertTypeCounts}
        filteredAlertsCount={filteredProcessEventAlerts.length}
        onAlertEventCategorySelected={handleProcessEventAlertCategorySelected}
      />

      {filteredProcessEventAlerts.map((alert: ProcessEvent, idx: number) => {
        const alertUuid = alert.kibana?.alert?.uuid || null;

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
