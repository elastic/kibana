/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useState, useMemo } from 'react';
import { EuiEmptyPrompt, EuiButtonGroup, EuiHorizontalRule } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { groupBy } from 'lodash';
import { ProcessEvent, Process } from '../../../common/types/process_tree';
import { useStyles } from './styles';
import { DetailPanelAlertListItem } from '../detail_panel_alert_list_item';
import { DetailPanelAlertGroupItem } from '../detail_panel_alert_group_item';

export const ALERTS_TAB_EMPTY_STATE_TEST_ID = 'sessionView:detailPanelAlertsEmptyState';
export const INVESTIGATED_ALERT_TEST_ID = 'sessionView:detailPanelInvestigatedAlert';
export const VIEW_MODE_TOGGLE = 'sessionView:detailPanelAlertsViewMode';

interface DetailPanelAlertTabDeps {
  alerts: ProcessEvent[];
  onProcessSelected: (process: Process) => void;
  onShowAlertDetails: (alertId: string) => void;
  investigatedAlert?: ProcessEvent;
}

const VIEW_MODE_LIST = 'listView';
const VIEW_MODE_GROUP = 'groupView';

/**
 * Host Panel of  session view detail panel.
 */
export const DetailPanelAlertTab = ({
  alerts,
  onProcessSelected,
  onShowAlertDetails,
  investigatedAlert,
}: DetailPanelAlertTabDeps) => {
  const styles = useStyles();
  const [viewMode, setViewMode] = useState(VIEW_MODE_LIST);
  const viewModes = [
    {
      id: VIEW_MODE_LIST,
      label: i18n.translate('xpack.sessionView.alertDetailsTab.listView', {
        defaultMessage: 'List view',
      }),
    },
    {
      id: VIEW_MODE_GROUP,
      label: i18n.translate('xpack.sessionView.alertDetailsTab.groupView', {
        defaultMessage: 'Group view',
      }),
    },
  ];

  const filteredAlerts = useMemo(() => {
    return alerts.filter((event) => {
      const isInvestigatedAlert =
        event.kibana?.alert.uuid === investigatedAlert?.kibana?.alert.uuid;
      return !isInvestigatedAlert;
    });
  }, [investigatedAlert, alerts]);

  const groupedAlerts = useMemo(() => {
    return groupBy(filteredAlerts, (event) => event.kibana?.alert.rule.uuid);
  }, [filteredAlerts]);

  if (alerts.length === 0) {
    return (
      <EuiEmptyPrompt
        data-test-subj={ALERTS_TAB_EMPTY_STATE_TEST_ID}
        title={
          <h2>
            <FormattedMessage
              id="xpack.sessionView.detailPanelAlertsEmptyTitle"
              defaultMessage="No alerts"
            />
          </h2>
        }
        body={
          <p>
            <FormattedMessage
              id="xpack.sessionView.detailPanelAlertsEmptyMsg"
              defaultMessage="No alerts were created for this session."
            />
          </p>
        }
      />
    );
  }

  return (
    <div css={styles.container}>
      <EuiButtonGroup
        data-test-subj={VIEW_MODE_TOGGLE}
        css={styles.viewMode}
        legend={i18n.translate('xpack.sessionView.alertDetailsTab.toggleViewMode', {
          defaultMessage: 'Toggle view mode',
        })}
        options={viewModes}
        idSelected={viewMode}
        onChange={setViewMode}
        buttonSize="compressed"
        isFullWidth
      />
      {investigatedAlert && (
        <div css={styles.stickyItem} data-test-subj={INVESTIGATED_ALERT_TEST_ID}>
          <DetailPanelAlertListItem
            event={investigatedAlert}
            onProcessSelected={onProcessSelected}
            onShowAlertDetails={onShowAlertDetails}
            isInvestigated={true}
          />
          <EuiHorizontalRule margin="m" size="full" />
        </div>
      )}

      {viewMode === VIEW_MODE_LIST
        ? filteredAlerts.map((event) => {
            const key = event.kibana?.alert.uuid;

            return (
              <DetailPanelAlertListItem
                key={key}
                event={event}
                onProcessSelected={onProcessSelected}
                onShowAlertDetails={onShowAlertDetails}
              />
            );
          })
        : Object.keys(groupedAlerts).map((ruleId: string) => {
            const alertsByRule = groupedAlerts[ruleId];

            return (
              <DetailPanelAlertGroupItem
                key={alertsByRule[0].kibana?.alert.rule.uuid}
                alerts={alertsByRule}
                onProcessSelected={onProcessSelected}
                onShowAlertDetails={onShowAlertDetails}
              />
            );
          })}
    </div>
  );
};
