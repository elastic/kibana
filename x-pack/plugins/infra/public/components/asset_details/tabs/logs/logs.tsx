/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import useDebounce from 'react-use/lib/useDebounce';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { EuiFieldSearch, EuiFlexGroup, EuiFlexItem, EuiButtonEmpty } from '@elastic/eui';
import { RedirectAppLinks } from '@kbn/shared-ux-link-redirect-app';
import { DEFAULT_LOG_VIEW, LogViewReference } from '../../../../../common/log_views';
import type { InventoryItemType } from '../../../../../common/inventory_models/types';
import { useKibanaContextForPlugin } from '../../../../hooks/use_kibana';
import { LogStream } from '../../../log_stream';
import { findInventoryFields } from '../../../../../common/inventory_models';
import { InfraLoadingPanel } from '../../../loading';

export interface LogsProps {
  currentTime: number;
  logViewReference?: LogViewReference | null;
  logViewLoading?: boolean;
  nodeName: string;
  nodeType: InventoryItemType;
  search?: string;
  onSearchChange?: (query: string) => void;
}

const TEXT_QUERY_THROTTLE_INTERVAL_MS = 500;

export const Logs = ({
  nodeName,
  currentTime,
  nodeType,
  logViewReference,
  search,
  logViewLoading = false,
  onSearchChange,
}: LogsProps) => {
  const { services } = useKibanaContextForPlugin();
  const { locators } = services;
  const [textQuery, setTextQuery] = useState(search ?? '');
  const [textQueryDebounced, setTextQueryDebounced] = useState(search ?? '');
  const startTimestamp = currentTime - 60 * 60 * 1000; // 60 minutes

  useDebounce(
    () => {
      if (onSearchChange) {
        onSearchChange(textQuery);
      }
      setTextQueryDebounced(textQuery);
    },
    TEXT_QUERY_THROTTLE_INTERVAL_MS,
    [textQuery]
  );

  const filter = useMemo(() => {
    const query = [
      `${findInventoryFields(nodeType).id}: "${nodeName}"`,
      ...(textQueryDebounced !== '' ? [textQueryDebounced] : []),
    ].join(' and ');

    return {
      language: 'kuery',
      query,
    };
  }, [nodeType, nodeName, textQueryDebounced]);

  const onQueryChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setTextQuery(e.target.value);
  }, []);

  const logView: LogViewReference = useMemo(
    () => (logViewReference ? logViewReference : DEFAULT_LOG_VIEW),
    [logViewReference]
  );

  const logsUrl = useMemo(() => {
    return locators.nodeLogsLocator.getRedirectUrl({
      nodeType,
      nodeId: nodeName,
      time: startTimestamp,
      filter: textQueryDebounced,
      logView,
    });
  }, [locators.nodeLogsLocator, nodeName, nodeType, startTimestamp, textQueryDebounced, logView]);

  return (
    <EuiFlexGroup direction="column" data-test-subj="infraAssetDetailsLogsTabContent">
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
            <RedirectAppLinks coreStart={services}>
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
            </RedirectAppLinks>
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
            startTimestamp={startTimestamp}
            endTimestamp={currentTime}
            query={filter}
            height="60vh"
            showFlyoutAction
          />
        )}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
