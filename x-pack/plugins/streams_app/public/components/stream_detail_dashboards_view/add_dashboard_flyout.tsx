/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  EuiButton,
  EuiFlexGroup,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiSearchBar,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { Dashboard } from '@kbn/streams-plugin/common/assets';
import { debounce } from 'lodash';
import React, { useMemo, useState, useEffect } from 'react';
import { useKibana } from '../../hooks/use_kibana';
import { useStreamsAppFetch } from '../../hooks/use_streams_app_fetch';
import { DashboardsTable } from './dashboard_table';

export function AddDashboardFlyout({
  entityId,
  onAddDashboards,
  linkedDashboards,
  onClose,
}: {
  entityId: string;
  onAddDashboards: (dashboard: Dashboard[]) => void;
  linkedDashboards: Dashboard[];
  onClose: () => void;
}) {
  const {
    dependencies: {
      start: {
        streams: { streamsRepositoryClient },
      },
    },
  } = useKibana();

  const [query, setQuery] = useState('');

  const [submittedQuery, setSubmittedQuery] = useState(query);

  const setSubmittedQueryDebounced = useMemo(() => {
    return debounce(setSubmittedQuery, 150);
  }, []);

  const dashboardSuggestionsFetch = useStreamsAppFetch(
    ({ signal }) => {
      return streamsRepositoryClient
        .fetch('GET /api/streams/{id}/dashboards/_suggestions', {
          signal,
          params: {
            path: {
              id: entityId,
            },
            query: {
              query: submittedQuery,
            },
          },
        })
        .then(({ suggestions }) => {
          return {
            dashboards: suggestions
              .map((suggestion) => suggestion.dashboard)
              .filter((dashboard) => {
                return !linkedDashboards.find(
                  (linkedDashboard) => linkedDashboard.assetId === dashboard.assetId
                );
              }),
          };
        });
    },
    [streamsRepositoryClient, entityId, submittedQuery, linkedDashboards]
  );

  const [selectedDashboards, setSelectedDashboards] = useState<Dashboard[]>([]);

  useEffect(() => {
    setSelectedDashboards([]);
  }, [linkedDashboards]);

  const allDashboards = useMemo(() => {
    return dashboardSuggestionsFetch.value?.dashboards || [];
  }, [dashboardSuggestionsFetch.value]);

  return (
    <EuiFlyout onClose={onClose}>
      <EuiFlyoutHeader hasBorder>
        <EuiTitle>
          <h2>
            {i18n.translate('xpack.streams.addDashboardFlyout.flyoutHeaderLabel', {
              defaultMessage: 'Add dashboards',
            })}
          </h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <EuiFlexGroup direction="column" gutterSize="m">
          <EuiText size="s">
            {i18n.translate('xpack.streams.addDashboardFlyout.helpLabel', {
              defaultMessage:
                'Select dashboards which you want to add and assign to the {stream} stream',
              values: {
                stream: entityId,
              },
            })}
          </EuiText>
          <EuiFlexGroup direction="row" gutterSize="s">
            <EuiSearchBar
              box={{
                incremental: true,
              }}
              query={query}
              onChange={({ queryText }) => {
                setQuery(queryText);
                setSubmittedQueryDebounced(queryText);
              }}
            />
          </EuiFlexGroup>
          <DashboardsTable
            dashboards={allDashboards}
            loading={dashboardSuggestionsFetch.loading}
            selecedDashboards={selectedDashboards}
            setSelectedDashboards={setSelectedDashboards}
          />
        </EuiFlexGroup>
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiButton
          data-test-subj="streamsAppAddDashboardFlyoutAddDashboardsButton"
          onClick={() => {
            onAddDashboards(selectedDashboards);
          }}
        >
          {i18n.translate('xpack.streams.addDashboardFlyout.addDashboardsButtonLabel', {
            defaultMessage: 'Add dashboards',
          })}
        </EuiButton>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
}
