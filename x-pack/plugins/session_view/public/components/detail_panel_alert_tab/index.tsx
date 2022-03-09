/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiHorizontalRule } from '@elastic/eui';
import { ProcessEvent, Process } from '../../../common/types/process_tree';
import { useStyles } from './styles';
import { DetailPanelAlertListItem } from '../detail_panel_alert_list_item';

interface DetailPanelAlertTabDeps {
  alerts: ProcessEvent[];
  onProcessSelected: (process: Process) => void;
  investigatedAlert?: ProcessEvent;
}

/**
 * Host Panel of  session view detail panel.
 */
export const DetailPanelAlertTab = ({
  alerts,
  onProcessSelected,
  investigatedAlert,
}: DetailPanelAlertTabDeps) => {
  const styles = useStyles();

  investigatedAlert = alerts[0];

  return (
    <div css={styles.container}>
      {investigatedAlert && (
        <div css={styles.stickyItem}>
          <DetailPanelAlertListItem
            event={investigatedAlert}
            onProcessSelected={onProcessSelected}
            isInvestigated={true}
          />
          <EuiHorizontalRule margin="m" size="full" />
        </div>
      )}
      {alerts.map((event) => {
        const isInvestigatedAlert =
          event.kibana?.alert.uuid === investigatedAlert?.kibana?.alert.uuid;

        if (isInvestigatedAlert) {
          return null;
        }

        return <DetailPanelAlertListItem event={event} onProcessSelected={onProcessSelected} />;
      })}
    </div>
  );
};
