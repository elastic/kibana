/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useRef, useState } from 'react';
import useDebounce from 'react-use/lib/useDebounce';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { EuiFieldSearch, EuiFlexGroup, EuiFlexItem, EuiButtonEmpty } from '@elastic/eui';
import { LogStream } from '@kbn/logs-shared-plugin/public';
import {
  DEFAULT_LOG_VIEW,
  getLogsLocatorsFromUrlService,
  LogViewReference,
} from '@kbn/logs-shared-plugin/common';
import { findInventoryFields } from '@kbn/metrics-data-access-plugin/common';
import { useKibanaContextForPlugin } from '../../../../hooks/use_kibana';
import { InfraLoadingPanel } from '../../../loading';
import { useAssetDetailsRenderPropsContext } from '../../hooks/use_asset_details_render_props';
import { useDataViewsContext } from '../../hooks/use_data_views';
import { useDatePickerContext } from '../../hooks/use_date_picker';
import { useAssetDetailsUrlState } from '../../hooks/use_asset_details_url_state';
import { useIntersectingState } from '../../hooks/use_intersecting_state';

const TEXT_QUERY_THROTTLE_INTERVAL_MS = 500;

export const Logs = () => {
  const ref = useRef<HTMLDivElement>(null);
  const { getDateRangeInTimestamp, dateRange, autoRefresh } = useDatePickerContext();
  const [urlState, setUrlState] = useAssetDetailsUrlState();
  const { asset } = useAssetDetailsRenderPropsContext();
  const { logs } = useDataViewsContext();

  const { loading: logViewLoading, reference: logViewReference } = logs ?? {};

  const { services } = useKibanaContextForPlugin();
  const { nodeLogsLocator } = getLogsLocatorsFromUrlService(services.share.url);
  const [textQuery, setTextQuery] = useState(urlState?.logsSearch ?? '');
  const [textQueryDebounced, setTextQueryDebounced] = useState(urlState?.logsSearch ?? '');

  const currentTimestamp = getDateRangeInTimestamp().to;
  const state = useIntersectingState(ref, {
    currentTimestamp,
    startTimestamp: currentTimestamp - 60 * 60 * 1000,
    dateRange,
    autoRefresh,
  });

  useDebounce(
    () => {
      setUrlState({ logsSearch: textQuery });
      setTextQueryDebounced(textQuery);
    },
    TEXT_QUERY_THROTTLE_INTERVAL_MS,
    [textQuery]
  );

  const filter = useMemo(() => {
    const query = [
      `${findInventoryFields(asset.type).id}: "${asset.name}"`,
      ...(textQueryDebounced !== '' ? [textQueryDebounced] : []),
    ].join(' and ');

    return {
      language: 'kuery',
      query,
    };
  }, [asset.type, asset.name, textQueryDebounced]);

  const onQueryChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setTextQuery(e.target.value);
  }, []);

  const logView: LogViewReference = useMemo(
    () => (logViewReference ? logViewReference : DEFAULT_LOG_VIEW),
    [logViewReference]
  );

  const logsUrl = useMemo(() => {
    return nodeLogsLocator.getRedirectUrl({
      nodeField: findInventoryFields(asset.type).id,
      nodeId: asset.name,
      time: state.startTimestamp,
      filter: textQueryDebounced,
      logView,
    });
  }, [nodeLogsLocator, asset.name, asset.type, state.startTimestamp, textQueryDebounced, logView]);

  return (
    <EuiFlexGroup direction="column" data-test-subj="infraAssetDetailsLogsTabContent" ref={ref}>
      <EuiFlexItem grow={false}>
        <EuiFlexGroup gutterSize="m" alignItems="center" responsive={false}>
          <EuiFlexItem>
            <EuiFieldSearch
              data-test-subj="infraAssetDetailsLogsTabFieldSearch"
              fullWidth
              placeholder={i18n.translate('xpack.infra.nodeDetails.logs.textFieldPlaceholder', {
                defaultMessage: 'Search for log entries...',
              })}
              value={textQuery}
              isClearable
              onChange={onQueryChange}
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              data-test-subj="infraAssetDetailsLogsTabOpenInLogsButton"
              size="xs"
              flush="both"
              iconType="popout"
              href={logsUrl}
            >
              <FormattedMessage
                id="xpack.infra.nodeDetails.logs.openLogsLink"
                defaultMessage="Open in Logs"
              />
            </EuiButtonEmpty>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem>
        {logViewLoading || !logViewReference ? (
          <InfraLoadingPanel
            width="100%"
            height="60vh"
            text={
              <FormattedMessage
                id="xpack.infra.hostsViewPage.tabs.logs.loadingEntriesLabel"
                defaultMessage="Loading entries"
              />
            }
          />
        ) : (
          <LogStream
            logView={logView}
            startTimestamp={state.startTimestamp}
            endTimestamp={state.currentTimestamp}
            startDateExpression={
              state.autoRefresh && !state.autoRefresh.isPaused ? state.dateRange.from : undefined
            }
            endDateExpression={
              state.autoRefresh && !state.autoRefresh.isPaused ? state.dateRange.to : undefined
            }
            query={filter}
            height="60vh"
            showFlyoutAction
            isStreaming={state.autoRefresh && !state.autoRefresh.isPaused}
          />
        )}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
