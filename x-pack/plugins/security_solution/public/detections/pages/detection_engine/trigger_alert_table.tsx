/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiFlyoutSize } from '@elastic/eui';
import { EuiCheckbox } from '@elastic/eui';
import { EuiFlexGroup, EuiFlexItem, EuiProgress } from '@elastic/eui';
import type { CustomFilter } from '@kbn/es-query';
import { buildQueryFromFilters } from '@kbn/es-query';
import type { FC } from 'react';
import { useCallback, useMemo } from 'react';
import { useState } from 'react';
import React from 'react';
import { Storage } from '@kbn/kibana-utils-plugin/public';
import type { AlertsTableStateProps } from '@kbn/triggers-actions-ui-plugin/public/application/sections/alerts_table/alerts_table_state';
import { SHOW_EXTERNAL_ALERTS } from '../../../common/components/events_tab/translations';
import { InspectButtonContainer } from '../../../common/components/inspect';
import { RightTopMenu } from '../../../common/components/events_viewer/right_top_menu';
import { ALERTS_TABLE_VIEW_SELECTION_KEY } from '../../../common/components/event_rendered_view/helpers';
import { SourcererScopeName } from '../../../common/store/sourcerer/model';
import type { TableId } from '../../../../common/types';
import { useKibana } from '../../../common/lib/kibana';
import { getDefaultViewSelection } from '../../../common/components/events_viewer/helpers';
import type { ViewSelection } from '../../../common/components/events_viewer/summary_view_select';

const storage = new Storage(localStorage);

interface DetectionEngineAlertTableProps {
  configId: string;
  flyoutSize: EuiFlyoutSize;
  inputFilters: CustomFilter[];
  tableId: TableId;
  sourcererScope?: SourcererScopeName;
}
export const DetectionEngineAlertTable: FC<DetectionEngineAlertTableProps> = ({
  configId,
  flyoutSize,
  inputFilters,
  tableId,
  sourcererScope = SourcererScopeName.detections,
}) => {
  const { triggersActionsUi } = useKibana().services;

  const boolQueryDSL = buildQueryFromFilters(inputFilters, undefined);

  const [tableView, setTableView] = useState<ViewSelection>(
    getDefaultViewSelection({
      tableId,
      value: storage.get(ALERTS_TABLE_VIEW_SELECTION_KEY),
    })
  );

  const [showExternalAlerts, setShowExternalAlerts] = useState(false);

  const toggleExternalAlerts = useCallback(() => setShowExternalAlerts((s) => !s), []);

  const toggleExternalAlertsCheckbox = useMemo(
    () => (
      <EuiCheckbox
        id="showExternalAlertsCheckbox"
        data-test-subj="showExternalAlertsCheckbox"
        aria-label={SHOW_EXTERNAL_ALERTS}
        checked={showExternalAlerts}
        color="text"
        label={SHOW_EXTERNAL_ALERTS}
        onChange={toggleExternalAlerts}
      />
    ),
    [showExternalAlerts, toggleExternalAlerts]
  );

  const additionalRightControls = useMemo(
    () => (
      <EuiFlexItem
        css={{
          position: 'relative',
        }}
      >
        <RightTopMenu
          tableView={tableView}
          loading={false}
          tableId={tableId}
          title={'Some Title'}
          onViewChange={(selectedView) => setTableView(selectedView)}
          additionalFilters={[toggleExternalAlertsCheckbox]}
          hasRightOffset={false}
        />
      </EuiFlexItem>
    ),
    [tableId, tableView, toggleExternalAlertsCheckbox]
  );

  const alertStateProps: AlertsTableStateProps = {
    alertsTableConfigurationRegistry: triggersActionsUi.alertsTableConfigurationRegistry,
    configurationId: configId,
    id: `detection-engine-alert-table-${configId}`,
    flyoutSize,
    featureIds: ['siem'],
    query: {
      bool: boolQueryDSL,
    },
    showExpandToDetails: false,
    additionalControls: {
      right: additionalRightControls,
    },
  };

  return false ? (
    <EuiFlexGroup>
      <EuiFlexItem>
        <EuiProgress size="xs" color="primary" />
      </EuiFlexItem>
    </EuiFlexGroup>
  ) : (
    <div>
      <InspectButtonContainer>
        {triggersActionsUi.getAlertsStateTable(alertStateProps)}
      </InspectButtonContainer>
    </div>
  );
};

DetectionEngineAlertTable.displayName = 'DetectionEngineAlertTable';
