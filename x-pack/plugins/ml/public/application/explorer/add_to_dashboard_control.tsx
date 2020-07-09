/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, useCallback, useMemo, useState, useEffect } from 'react';
import { debounce } from 'lodash';
import {
  EuiFormRow,
  EuiCheckboxGroup,
  EuiInMemoryTableProps,
  EuiModal,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiOverlayMask,
  EuiSpacer,
  EuiButtonEmpty,
  EuiButton,
  EuiModalFooter,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiModalBody } from '@elastic/eui';
import { EuiInMemoryTable } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useMlKibana } from '../contexts/kibana';
import { SavedObjectDashboard } from '../../../../../../src/plugins/dashboard/public';
import {
  ANOMALY_SWIMLANE_EMBEDDABLE_TYPE,
  getDefaultPanelTitle,
} from '../../embeddables/anomaly_swimlane/anomaly_swimlane_embeddable';
import { useDashboardService } from '../services/dashboard_service';
import { SWIMLANE_TYPE, SwimlaneType } from './explorer_constants';
import { JobId } from '../../../common/types/anomaly_detection_jobs';

export interface DashboardItem {
  id: string;
  title: string;
  description: string | undefined;
  attributes: SavedObjectDashboard;
}

export type EuiTableProps = EuiInMemoryTableProps<DashboardItem>;

function getDefaultEmbeddablepaPanelConfig(jobIds: JobId[]) {
  return {
    type: ANOMALY_SWIMLANE_EMBEDDABLE_TYPE,
    title: getDefaultPanelTitle(jobIds),
  };
}

interface AddToDashboardControlProps {
  jobIds: JobId[];
  viewBy: string;
  onClose: (callback?: () => Promise<any>) => void;
}

/**
 * Component for attaching anomaly swim lane embeddable to dashboards.
 */
export const AddToDashboardControl: FC<AddToDashboardControlProps> = ({
  onClose,
  jobIds,
  viewBy,
}) => {
  const {
    notifications: { toasts },
    services: {
      application: { navigateToUrl },
    },
  } = useMlKibana();

  useEffect(() => {
    fetchDashboards();

    return () => {
      fetchDashboards.cancel();
    };
  }, []);

  const dashboardService = useDashboardService();

  const [isLoading, setIsLoading] = useState(false);
  const [selectedSwimlanes, setSelectedSwimlanes] = useState<{ [key in SwimlaneType]: boolean }>({
    [SWIMLANE_TYPE.OVERALL]: true,
    [SWIMLANE_TYPE.VIEW_BY]: false,
  });
  const [dashboardItems, setDashboardItems] = useState<DashboardItem[]>([]);
  const [selectedItems, setSelectedItems] = useState<DashboardItem[]>([]);

  const fetchDashboards = useCallback(
    debounce(async (query?: string) => {
      try {
        const response = await dashboardService.fetchDashboards(query);
        const items: DashboardItem[] = response.savedObjects.map((savedObject) => {
          return {
            id: savedObject.id,
            title: savedObject.attributes.title,
            description: savedObject.attributes.description,
            attributes: savedObject.attributes,
          };
        });
        setDashboardItems(items);
      } catch (e) {
        toasts.danger({
          body: e,
        });
      }
      setIsLoading(false);
    }, 500),
    []
  );

  const search: EuiTableProps['search'] = useMemo(() => {
    return {
      onChange: ({ queryText }) => {
        setIsLoading(true);
        fetchDashboards(queryText);
      },
      box: {
        incremental: true,
        'data-test-subj': 'mlDashboardsSearchBox',
      },
    };
  }, []);

  const addSwimlaneToDashboardCallback = useCallback(async () => {
    const swimlanes = Object.entries(selectedSwimlanes)
      .filter(([, isSelected]) => isSelected)
      .map(([swimlaneType]) => swimlaneType);

    for (const selectedDashboard of selectedItems) {
      const panelsData = swimlanes.map((swimlaneType) => {
        const config = getDefaultEmbeddablepaPanelConfig(jobIds);
        if (swimlaneType === SWIMLANE_TYPE.VIEW_BY) {
          return {
            ...config,
            embeddableConfig: {
              jobIds,
              swimlaneType,
              viewBy,
            },
          };
        }
        return {
          ...config,
          embeddableConfig: {
            jobIds,
            swimlaneType,
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
  }, [selectedSwimlanes, selectedItems]);

  const columns: EuiTableProps['columns'] = [
    {
      field: 'title',
      name: i18n.translate('xpack.ml.explorer.dashboardsTable.titleColumnHeader', {
        defaultMessage: 'Title',
      }),
      sortable: true,
      truncateText: true,
    },
    {
      field: 'description',
      name: i18n.translate('xpack.ml.explorer.dashboardsTable.descriptionColumnHeader', {
        defaultMessage: 'Description',
      }),
      truncateText: true,
    },
  ];

  const swimlaneTypeOptions = [
    {
      id: SWIMLANE_TYPE.OVERALL,
      label: i18n.translate('xpack.ml.explorer.overallLabel', {
        defaultMessage: 'Overall',
      }),
    },
    {
      id: SWIMLANE_TYPE.VIEW_BY,
      label: i18n.translate('xpack.ml.explorer.viewByFieldLabel', {
        defaultMessage: 'View by {viewByField}',
        values: { viewByField: viewBy },
      }),
    },
  ];

  const selection: EuiTableProps['selection'] = {
    onSelectionChange: setSelectedItems,
  };

  const noSwimlaneSelected = Object.values(selectedSwimlanes).every((isSelected) => !isSelected);

  return (
    <EuiOverlayMask data-test-subj="mlAddToDashboardModal">
      <EuiModal onClose={onClose.bind(null, undefined)}>
        <EuiModalHeader>
          <EuiModalHeaderTitle>
            <FormattedMessage
              id="xpack.ml.explorer.dashboardsTitle"
              defaultMessage="Add swim lanes to dashboards"
            />
          </EuiModalHeaderTitle>
        </EuiModalHeader>
        <EuiModalBody>
          <EuiFormRow
            label={
              <FormattedMessage
                id="xpack.ml.explorer.addToDashboard.selectSwimlanesLabel"
                defaultMessage="Select swim lane view:"
              />
            }
          >
            <EuiCheckboxGroup
              options={swimlaneTypeOptions}
              idToSelectedMap={selectedSwimlanes}
              onChange={(optionId) => {
                const newSelection = {
                  ...selectedSwimlanes,
                  [optionId]: !selectedSwimlanes[optionId as SwimlaneType],
                };
                setSelectedSwimlanes(newSelection);
              }}
              data-test-subj="mlAddToDashboardSwimlaneTypeSelector"
            />
          </EuiFormRow>

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
            disabled={noSwimlaneSelected || selectedItems.length !== 1}
            onClick={async () => {
              onClose(async () => {
                const selectedDashboardId = selectedItems[0].id;
                await addSwimlaneToDashboardCallback();
                await navigateToUrl(
                  await dashboardService.getDashboardEditUrl(selectedDashboardId)
                );
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
            onClick={onClose.bind(null, addSwimlaneToDashboardCallback)}
            disabled={noSwimlaneSelected || selectedItems.length === 0}
            data-test-subj="mlAddToDashboardsButton"
          >
            <FormattedMessage
              id="xpack.ml.explorer.dashboardsTable.addToDashboardLabel"
              defaultMessage="Add to dashboards"
            />
          </EuiButton>
        </EuiModalFooter>
      </EuiModal>
    </EuiOverlayMask>
  );
};
