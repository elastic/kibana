/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, useCallback, useMemo, useState, useEffect } from 'react';
import { debounce } from 'lodash';
import {
  EuiButtonGroup,
  EuiButtonIcon,
  EuiInMemoryTableProps,
  EuiLoadingSpinner,
  EuiModal,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiOverlayMask,
  EuiToolTip,
  EuiSpacer,
  EuiCallOut,
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
  limit: number;
  onClose: () => void;
}

/**
 * Component for attaching anomaly swimlane embeddable to dashboards.
 */
export const AddToDashboardControl: FC<AddToDashboardControlProps> = ({
  onClose,
  jobIds,
  viewBy,
  limit,
}) => {
  const {
    notifications: { toasts },
  } = useMlKibana();

  useEffect(() => {
    fetchDashboards();

    return () => {
      fetchDashboards.cancel();
    };
  }, []);

  const dashboardService = useDashboardService();

  const [addedDashboards, setAddedDashboards] = useState<{
    [id: string]: 'success' | 'pending' | 'redirecting' | undefined;
  }>({});

  const [isLoading, setIsLoading] = useState(false);
  const [selectedSwimlanes, setSelectedSwimlanes] = useState<{ [key in SwimlaneType]: boolean }>({
    [SWIMLANE_TYPE.OVERALL]: true,
    [SWIMLANE_TYPE.VIEW_BY]: false,
  });
  const [dashboardItems, setDashboardItems] = useState<DashboardItem[]>([]);

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
      },
    };
  }, []);

  const addSwimlaneToDashboardCallback = useCallback(
    async (item: DashboardItem) => {
      setAddedDashboards({ ...addedDashboards, [item.id]: 'pending' });

      const panelsData = Object.entries(selectedSwimlanes)
        .filter(([, isSelected]) => isSelected)
        .map(([swimlaneType]) => {
          const config = getDefaultEmbeddablepaPanelConfig(jobIds);
          if (swimlaneType === SWIMLANE_TYPE.VIEW_BY) {
            return {
              ...config,
              embeddableConfig: {
                jobIds,
                swimlaneType,
                viewBy,
                limit,
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
        await dashboardService.attachPanels(item.id, item.attributes, panelsData);
        setAddedDashboards({ ...addedDashboards, [item.id]: 'success' });
      } catch (e) {
        toasts.danger({
          body: e,
        });
      }
    },
    [addedDashboards, selectedSwimlanes]
  );

  const columns: EuiTableProps['columns'] = useMemo(
    () => [
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
      {
        field: 'actions',
        name: i18n.translate('xpack.ml.explorer.dashboardsTable.actionsColumnHeader', {
          defaultMessage: 'Actions',
        }),
        align: 'right',
        actions: [
          {
            name: i18n.translate('xpack.ml.explorer.dashboardsTable.quickAddLabel', {
              defaultMessage: 'Quick add',
            }),
            render: (item) => {
              return addedDashboards[item.id] === 'pending' ? (
                <EuiLoadingSpinner size="m" />
              ) : (
                <EuiToolTip
                  content={
                    addedDashboards[item.id] === 'success' ? (
                      <FormattedMessage
                        id="xpack.ml.explorer.dashboardsTitle.successfullyAddedMessage"
                        defaultMessage="Successfully added"
                      />
                    ) : (
                      <FormattedMessage
                        id="xpack.ml.explorer.dashboardsTable.quickAddLabel"
                        defaultMessage="Quick add"
                      />
                    )
                  }
                >
                  <EuiButtonIcon
                    color="primary"
                    onClick={addSwimlaneToDashboardCallback.bind(null, item)}
                    iconType={
                      addedDashboards[item.id] === 'success'
                        ? 'checkInCircleFilled'
                        : 'plusInCircle'
                    }
                    aria-label="Quick add"
                    disabled={addedDashboards[item.id] === 'success'}
                  />
                </EuiToolTip>
              );
            },
          },
          {
            name: i18n.translate('xpack.ml.explorer.dashboardsTable.editInDashboard', {
              defaultMessage: 'Edit in dashboard',
            }),
            onClick: async (item) => {
              await addSwimlaneToDashboardCallback(item);
              setAddedDashboards({ ...addedDashboards, [item.id]: 'redirecting' });
              window.location.href = await dashboardService.getDashboardEditUrl(item.id);
            },
            type: 'icon',
            icon: 'pencil',
            enabled: (item) => !addedDashboards[item.id],
          },
        ],
      },
    ],
    [addedDashboards, selectedSwimlanes]
  );

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
        defaultMessage: 'View by {viewByField}, up to {limit} rows',
        values: { viewByField: viewBy, limit },
      }),
    },
  ];

  const redirectToDashboardInProgress = Object.entries(addedDashboards).find(
    ([id, status]) => status === 'redirecting'
  );

  return (
    <EuiOverlayMask>
      <EuiModal onClose={onClose}>
        <EuiModalHeader>
          <EuiModalHeaderTitle>
            <FormattedMessage
              id="xpack.ml.explorer.dashboardsTitle"
              defaultMessage="Attach swimlanes to dashboards"
            />
          </EuiModalHeaderTitle>
        </EuiModalHeader>

        <EuiModalBody>
          {redirectToDashboardInProgress ? (
            <EuiCallOut
              size="s"
              title={
                <FormattedMessage
                  id="xpack.ml.explorer.dashboardsTitle"
                  defaultMessage="Redirecting to the dashboard {dashboardTitle}"
                  values={{
                    dashboardTitle: dashboardItems.find(
                      (item) => item.id === redirectToDashboardInProgress[0]
                    )!.title,
                  }}
                />
              }
            />
          ) : (
            <>
              <EuiButtonGroup
                type="multi"
                id="selectSwimlaneType"
                name="selectSwimlaneType"
                idToSelectedMap={selectedSwimlanes}
                color="primary"
                isFullWidth
                legend={i18n.translate('xpack.ml.explorer.addToDashboard.selectSwimlanesLabel', {
                  defaultMessage: 'Swimlanes to attach',
                })}
                options={swimlaneTypeOptions}
                onChange={(optionId) => {
                  const newSelection = {
                    ...selectedSwimlanes,
                    [optionId]: !selectedSwimlanes[optionId as SwimlaneType],
                  };
                  // at least one swimlane has to be selected
                  if (Object.values(newSelection).every((isSelected) => !isSelected)) return;
                  setSelectedSwimlanes(newSelection);
                }}
              />
              <EuiSpacer size="m" />
              <EuiInMemoryTable
                items={dashboardItems}
                loading={isLoading}
                columns={columns}
                search={search}
                pagination={true}
                sorting={true}
              />
            </>
          )}
        </EuiModalBody>
      </EuiModal>
    </EuiOverlayMask>
  );
};
