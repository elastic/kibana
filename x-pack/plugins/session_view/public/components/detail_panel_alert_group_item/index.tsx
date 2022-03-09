/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useMemo } from 'react';
import { EuiIcon, EuiText, EuiAccordion, EuiNotificationBadge } from '@elastic/eui';
import { Process, ProcessEvent } from '../../../common/types/process_tree';
import { useStyles } from '../detail_panel_alert_list_item/styles';
import { DetailPanelAlertListItem } from '../detail_panel_alert_list_item';
import { ALERT_COUNT_THRESHOLD } from '../../../common/constants';

interface DetailPanelAlertsGroupItemDeps {
  alerts: ProcessEvent[];
  onProcessSelected: (process: Process) => void;
}

/**
 * Detail panel description list item.
 */
export const DetailPanelAlertGroupItem = ({
  alerts,
  onProcessSelected,
}: DetailPanelAlertsGroupItemDeps) => {
  const styles = useStyles({});

  const alertsCount = useMemo(() => {
    return alerts.length >= ALERT_COUNT_THRESHOLD ? ALERT_COUNT_THRESHOLD + '+' : alerts.length;
  }, [alerts]);

  if (!alerts[0].kibana) {
    return null;
  }

  const { rule } = alerts[0].kibana.alert;

  return (
    <EuiAccordion
      id={rule.uuid}
      arrowDisplay="right"
      initialIsOpen={false}
      buttonContent={
        <EuiText css={styles.alertTitle} size="s">
          <p>
            <EuiIcon color="danger" type="alert" css={styles.alertIcon} />
            {rule.name}
          </p>
        </EuiText>
      }
      css={styles.alertItem}
      extraAction={
        <EuiNotificationBadge className="eui-alignCenter" size="m">
          {alertsCount}
        </EuiNotificationBadge>
      }
    >
      {alerts.map((event) => {
        const key = 'minimal_' + event.kibana?.alert.uuid;

        return (
          <DetailPanelAlertListItem
            key={key}
            minimal
            event={event}
            onProcessSelected={onProcessSelected}
          />
        );
      })}
    </EuiAccordion>
  );
};
