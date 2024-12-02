/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  EuiButton,
  EuiFilterButton,
  EuiFilterGroup,
  EuiFlexGroup,
  EuiPopover,
  EuiSearchBar,
  EuiSelectable,
  EuiFlexItem,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { StreamDefinition } from '@kbn/streams-plugin/common';
import React, { useMemo, useState, useCallback } from 'react';
import { Dashboard } from '@kbn/streams-plugin/common/assets';
import { useAbortController } from '@kbn/observability-utils-browser/hooks/use_abort_controller';
import { useKibana } from '../../hooks/use_kibana';
import { useStreamsAppFetch } from '../../hooks/use_streams_app_fetch';
import { AddDashboardFlyout } from './add_dashboard_flyout';
import { DashboardsTable } from './dashboard_table';

const useDashboardCrud = (id?: string) => {
  const { signal } = useAbortController();
  const {
    dependencies: {
      start: {
        streams: { streamsRepositoryClient },
      },
    },
  } = useKibana();

  const dashboardsFetch = useStreamsAppFetch(() => {
    if (!id) {
      return Promise.resolve(undefined);
    }
    return streamsRepositoryClient.fetch('GET /api/streams/{id}/dashboards', {
      signal,
      params: {
        path: {
          id,
        },
      },
    });
  }, [id, signal, streamsRepositoryClient]);

  const addDashboards = useCallback(
    async (dashboards: Dashboard[]) => {
      if (!id) {
        return;
      }
      await Promise.all(
        dashboards.map((dashboard) => {
          return streamsRepositoryClient.fetch('PUT /api/streams/{id}/dashboards/{dashboardId}', {
            signal,
            params: {
              path: {
                id,
                dashboardId: dashboard.assetId,
              },
            },
          });
        })
      );
      await dashboardsFetch.refresh();
    },
    [dashboardsFetch, id, signal, streamsRepositoryClient]
  );

  const removeDashboards = useCallback(
    async (dashboards: Dashboard[]) => {
      if (!id) {
        return;
      }
      await Promise.all(
        dashboards.map((dashboard) => {
          return streamsRepositoryClient.fetch(
            'DELETE /api/streams/{id}/dashboards/{dashboardId}',
            {
              signal,
              params: {
                path: {
                  id,
                  dashboardId: dashboard.assetId,
                },
              },
            }
          );
        })
      );
      await dashboardsFetch.refresh();
    },
    [dashboardsFetch, id, signal, streamsRepositoryClient]
  );

  return {
    dashboardsFetch,
    addDashboards,
    removeDashboards,
  };
};

export function StreamDetailDashboardsView({ definition }: { definition?: StreamDefinition }) {
  const [query, setQuery] = useState('');

  const [isTagsPopoverOpen, setIsTagsPopoverOpen] = useState(false);

  const [isAddDashboardFlyoutOpen, setIsAddDashboardFlyoutOpen] = useState(false);

  const { dashboardsFetch, addDashboards, removeDashboards } = useDashboardCrud(definition?.id);

  const tagsButton = (
    <EuiFilterButton iconType="arrowDown" isSelected={isTagsPopoverOpen}>
      {i18n.translate('xpack.streams.streamDetailDashboardView.tagsFilterButtonLabel', {
        defaultMessage: 'Tags',
      })}
    </EuiFilterButton>
  );

  const linkedDashboards = useMemo(() => {
    return dashboardsFetch.value?.dashboards ?? [];
  }, [dashboardsFetch.value?.dashboards]);

  const filteredDashboards = useMemo(() => {
    return linkedDashboards.filter((dashboard) => {
      return dashboard.label.toLowerCase().includes(query.toLowerCase());
    });
  }, [linkedDashboards, query]);

  const [selectedDashboards, setSelectedDashboards] = useState<Dashboard[]>([]);

  return (
    <EuiFlexGroup direction="column">
      <EuiFlexItem grow={false}>
        <EuiFlexGroup direction="row" gutterSize="s">
          {selectedDashboards.length > 0 && (
            <EuiButton
              data-test-subj="streamsAppStreamDetailRemoveDashboardButton"
              iconType="trash"
              onClick={async () => {
                await removeDashboards(selectedDashboards);
                setSelectedDashboards([]);
              }}
              color="danger"
            >
              {i18n.translate('xpack.streams.streamDetailDashboardView.removeSelectedButtonLabel', {
                defaultMessage: 'Unlink selected',
              })}
            </EuiButton>
          )}
          <EuiSearchBar
            query={query}
            box={{
              incremental: true,
            }}
            onChange={(nextQuery) => {
              setQuery(nextQuery.queryText);
            }}
          />
          <EuiFilterGroup>
            <EuiPopover button={tagsButton} isOpen={isTagsPopoverOpen}>
              <EuiSelectable />
            </EuiPopover>
          </EuiFilterGroup>
          <EuiButton
            data-test-subj="streamsAppStreamDetailAddDashboardButton"
            iconType="plusInCircle"
            onClick={() => {
              setIsAddDashboardFlyoutOpen(true);
            }}
          >
            {i18n.translate('xpack.streams.streamDetailDashboardView.addADashboardButtonLabel', {
              defaultMessage: 'Add a dashboard',
            })}
          </EuiButton>
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem>
        <DashboardsTable
          dashboards={filteredDashboards}
          loading={dashboardsFetch.loading}
          selecedDashboards={selectedDashboards}
          setSelectedDashboards={setSelectedDashboards}
        />
        {definition && isAddDashboardFlyoutOpen ? (
          <AddDashboardFlyout
            linkedDashboards={linkedDashboards}
            entityId={definition.id}
            onAddDashboards={async (dashboards) => {
              await addDashboards(dashboards);
              setIsAddDashboardFlyoutOpen(false);
            }}
            onClose={() => {
              setIsAddDashboardFlyoutOpen(false);
            }}
          />
        ) : null}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
