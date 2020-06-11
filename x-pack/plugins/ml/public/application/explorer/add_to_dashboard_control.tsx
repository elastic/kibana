/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, useCallback, useMemo, useState, memo } from 'react';
import { debounce } from 'lodash';
import {
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiInMemoryTableProps,
  EuiLoadingSpinner,
  EuiModal,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiOverlayMask,
  EuiToolTip,
  htmlIdGenerator,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiModalBody } from '@elastic/eui';
import { EuiInMemoryTable } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useUpdateEffect } from 'react-use';
import { useMlKibana } from '../contexts/kibana';
import {
  SavedObjectDashboard,
  SavedDashboardPanel,
} from '../../../../../../src/plugins/dashboard/public';
import {
  AnomalySwimlaneEmbeddableCustomOutput,
  ANOMALY_SWIMLANE_EMBEDDABLE_TYPE,
  getDefaultPanelTitle,
} from '../../embeddables/anomaly_swimlane/anomaly_swimlane_embeddable';

export interface DashboardItem {
  id: string;
  title: string;
  description: string | undefined;
  attributes: SavedObjectDashboard;
}

export type EuiTableProps = EuiInMemoryTableProps<DashboardItem>;

export const AddToDashboardControl: FC<AnomalySwimlaneEmbeddableCustomOutput> = memo(
  (embeddableConfig) => {
    const {
      services: {
        savedObjects: { client: savedObjectClient },
        kibanaVersion,
      },
      notifications: { toasts },
    } = useMlKibana();

    const [addedDashboards, setAddedDashboards] = useState<{
      [id: string]: 'success' | 'pending' | undefined;
    }>({});

    const [isModalVisible, setIsModalVisible] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [dashboardItems, setDashboardItems] = useState<DashboardItem[]>([]);

    const fetchDashboards = useCallback(
      debounce(async (query?: string) => {
        try {
          const response = await savedObjectClient.find<SavedObjectDashboard>({
            type: 'dashboard',
            perPage: 10,
            search: query ? `${query}*` : '',
            searchFields: ['title^3', 'description'],
          });
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

    useUpdateEffect(() => {
      if (isModalVisible) {
        fetchDashboards();
      } else {
        fetchDashboards.cancel();
      }
      // Make sure ongoing request is cancelled on destroy
      return fetchDashboards.cancel;
    }, [isModalVisible]);

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

        const { attributes } = item;
        const panelData = JSON.parse(attributes.panelsJSON) as SavedDashboardPanel[];
        const panelIndex = htmlIdGenerator()();

        const maxPanel = panelData.reduce((prev, current) =>
          prev.gridData.y > current.gridData.y ? prev : current
        );
        const version = kibanaVersion;

        panelData.push({
          panelIndex,
          embeddableConfig,
          title: getDefaultPanelTitle(embeddableConfig.jobIds),
          type: ANOMALY_SWIMLANE_EMBEDDABLE_TYPE,
          version,
          gridData: {
            h: 15,
            i: panelIndex,
            w: 24,
            x: 0,
            y: maxPanel.gridData.y + maxPanel.gridData.h + 10,
          },
        });

        try {
          await savedObjectClient.update('dashboard', item.id, {
            ...attributes,
            panelsJSON: JSON.stringify(panelData),
          });
          setAddedDashboards({ ...addedDashboards, [item.id]: 'success' });
        } catch (e) {
          toasts.danger({
            body: e,
          });
        }
      },
      [addedDashboards]
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
          ],
        },
      ],
      [addedDashboards]
    );

    let modal = null;
    if (isModalVisible) {
      modal = (
        <EuiOverlayMask>
          <EuiModal
            onClose={() => {
              setIsModalVisible(false);
            }}
          >
            <EuiModalHeader>
              <EuiModalHeaderTitle>
                <FormattedMessage
                  id="xpack.ml.explorer.dashboardsTitle"
                  defaultMessage="Dashboards"
                />
              </EuiModalHeaderTitle>
            </EuiModalHeader>

            <EuiModalBody>
              <EuiInMemoryTable
                items={dashboardItems}
                loading={isLoading}
                columns={columns}
                search={search}
                pagination={true}
                sorting={true}
              />
            </EuiModalBody>
          </EuiModal>
        </EuiOverlayMask>
      );
    }

    return (
      <div>
        <EuiButtonEmpty
          onClick={() => {
            setIsModalVisible(true);
          }}
        >
          <FormattedMessage
            id="xpack.ml.explorer.addToDashboardLabel"
            defaultMessage="Add to dashboard"
          />
        </EuiButtonEmpty>

        {modal}
      </div>
    );
  }
);
