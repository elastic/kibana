/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiButtonEmpty,
  EuiFormRow,
  EuiInMemoryTable,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiSpacer,
} from '@elastic/eui';
import React, { FC, useCallback, useState } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { JobId } from '../../../../common/types/anomaly_detection_jobs';
import { ANOMALY_EXPLORER_CHARTS_EMBEDDABLE_TYPE } from '../../../embeddables';
import { useMlKibana } from '../../contexts/kibana';
import { useDashboardService } from '../../services/dashboard_service';
import { SWIMLANE_TYPE } from '../explorer_constants';
import { columns, useDashboardTable } from './dashboards_table';
import { getDefaultExplorerChartsPanelTitle } from '../../../embeddables/anomaly_explorer/anomaly_explorer_embeddable';

function getDefaultEmbeddablePanelConfig(jobIds: JobId[]) {
  return {
    type: ANOMALY_EXPLORER_CHARTS_EMBEDDABLE_TYPE,
    title: getDefaultExplorerChartsPanelTitle(jobIds),
  };
}

interface AddToDashboardControlProps {
  jobIds: JobId[];
  onClose: (callback?: () => Promise<any>) => void;
  viewBy?: string;
}

/**
 * Component for attaching anomaly swim lane embeddable to dashboards.
 */
export const AddExplorerChartsToDashboardControl: FC<AddToDashboardControlProps> = ({
  onClose,
  jobIds,
}) => {
  const {
    notifications: { toasts },
    services: {
      application: { navigateToUrl },
    },
  } = useMlKibana();
  const dashboardService = useDashboardService();
  const { selectedItems, selection, dashboardItems, isLoading, search } = useDashboardTable();

  const [selectedExplorerCharts] = useState({
    [SWIMLANE_TYPE.OVERALL]: true,
  });

  const addExplorerChartsToDashboardCallback = useCallback(async () => {
    const explorerCharts = ['overall'];

    for (const selectedDashboard of selectedItems) {
      const panelsData = explorerCharts.map(() => {
        const config = getDefaultEmbeddablePanelConfig(jobIds);
        return {
          ...config,
          embeddableConfig: {
            jobIds,
            maxSeriesToPlot: 6,
          },
        };
      });

      try {
        await dashboardService.attachPanels(
          selectedDashboard.id,
          selectedDashboard.attributes,
          panelsData
        );
        toasts.success({
          title: (
            <FormattedMessage
              id="xpack.ml.explorer.dashboardsTable.savedSuccessfullyTitle"
              defaultMessage='Dashboard "{dashboardTitle}" updated successfully'
              values={{ dashboardTitle: selectedDashboard.title }}
            />
          ),
          toastLifeTimeMs: 3000,
        });
      } catch (e) {
        toasts.danger({
          body: e,
        });
      }
    }
  }, [selectedItems]);

  const noExplorerChartsSelected = Object.values(selectedExplorerCharts).every(
    (isSelected) => !isSelected
  );

  return (
    <EuiModal onClose={onClose.bind(null, undefined)} data-test-subj="mlAddToDashboardModal">
      <EuiModalHeader>
        <EuiModalHeaderTitle>
          <FormattedMessage
            id="xpack.ml.explorer.dashboardsTitle"
            defaultMessage="Add anomaly charts to dashboards"
          />
        </EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>
        <EuiSpacer size="m" />

        <EuiFormRow
          fullWidth
          label={
            <FormattedMessage
              id="xpack.ml.explorer.addToDashboard.selectDashboardsLabel"
              defaultMessage="Select dashboards:"
            />
          }
          data-test-subj="mlDashboardSelectionContainer"
        >
          <EuiInMemoryTable
            itemId="id"
            isSelectable={true}
            selection={selection}
            items={dashboardItems}
            loading={isLoading}
            columns={columns}
            search={search}
            pagination={true}
            sorting={true}
            data-test-subj="mlDashboardSelectionTable"
          />
        </EuiFormRow>
      </EuiModalBody>
      <EuiModalFooter>
        <EuiButtonEmpty onClick={onClose.bind(null, undefined)}>
          <FormattedMessage
            id="xpack.ml.explorer.addToDashboard.cancelButtonLabel"
            defaultMessage="Cancel"
          />
        </EuiButtonEmpty>
        <EuiButton
          disabled={noExplorerChartsSelected || selectedItems.length !== 1}
          onClick={async () => {
            onClose(async () => {
              const selectedDashboardId = selectedItems[0].id;
              await addExplorerChartsToDashboardCallback();
              await navigateToUrl(await dashboardService.getDashboardEditUrl(selectedDashboardId));
            });
          }}
          data-test-subj="mlAddAndEditDashboardButton"
        >
          <FormattedMessage
            id="xpack.ml.explorer.dashboardsTable.addAndEditDashboardLabel"
            defaultMessage="Add and edit dashboard"
          />
        </EuiButton>
        <EuiButton
          fill
          onClick={onClose.bind(null, addExplorerChartsToDashboardCallback)}
          disabled={noExplorerChartsSelected || selectedItems.length === 0}
          data-test-subj="mlAddToDashboardsButton"
        >
          <FormattedMessage
            id="xpack.ml.explorer.dashboardsTable.addToDashboardLabel"
            defaultMessage="Add to dashboards"
          />
        </EuiButton>
      </EuiModalFooter>
    </EuiModal>
  );
};
