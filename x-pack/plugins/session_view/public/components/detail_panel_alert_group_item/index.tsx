/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useMemo } from 'react';
import { EuiIcon, EuiText, EuiAccordion, EuiNotificationBadge } from '@elastic/eui';
import { ProcessEvent } from '../../../common/types/process_tree';
import { ALERT_COUNT_THRESHOLD } from '../../../common/constants';
import { dataOrDash } from '../../utils/data_or_dash';
import { useStyles } from '../detail_panel_alert_list_item/styles';
import { DetailPanelAlertListItem } from '../detail_panel_alert_list_item';

export const ALERT_GROUP_ITEM_TEST_ID = 'sessionView:detailPanelAlertGroupItem';
export const ALERT_GROUP_ITEM_COUNT_TEST_ID = 'sessionView:detailPanelAlertGroupCount';
export const ALERT_GROUP_ITEM_TITLE_TEST_ID = 'sessionView:detailPanelAlertGroupTitle';

interface DetailPanelAlertsGroupItemDeps {
  alerts: ProcessEvent[];
  onJumpToEvent: (event: ProcessEvent) => void;
  onShowAlertDetails: (alertId: string) => void;
}

/**
 * Detail panel description list item.
 */
export const DetailPanelAlertGroupItem = ({
  alerts,
  onJumpToEvent,
  onShowAlertDetails,
}: DetailPanelAlertsGroupItemDeps) => {
  const styles = useStyles();

  const alertsCount = useMemo(() => {
    return alerts.length >= ALERT_COUNT_THRESHOLD ? ALERT_COUNT_THRESHOLD + '+' : alerts.length;
  }, [alerts]);

  if (!alerts[0].kibana) {
    return null;
  }

  const { rule } = alerts[0]?.kibana?.alert ?? {};

  return (
    <EuiAccordion
      id={rule?.uuid ?? ''}
      data-test-subj={ALERT_GROUP_ITEM_TEST_ID}
      arrowDisplay="right"
      initialIsOpen={false}
      buttonContent={
        <EuiText data-test-subj={ALERT_GROUP_ITEM_TITLE_TEST_ID} css={styles.alertTitle} size="s">
          <p>
            <EuiIcon color="danger" type="alert" css={styles.alertIcon} />
            {dataOrDash(rule?.name)}
          </p>
        </EuiText>
      }
      css={styles.alertItem}
      extraAction={
        <EuiNotificationBadge
          data-test-subj={ALERT_GROUP_ITEM_COUNT_TEST_ID}
          className="eui-alignCenter"
          size="m"
        >
          {alertsCount}
        </EuiNotificationBadge>
      }
    >
      {alerts.map((event) => {
        const key = 'minimal_' + event.kibana?.alert?.uuid;

        return (
          <DetailPanelAlertListItem
            key={key}
            minimal
            event={event}
            onJumpToEvent={onJumpToEvent}
            onShowAlertDetails={onShowAlertDetails}
          />
        );
      })}
    </EuiAccordion>
  );
};
