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
import type { InventoryItemType } from '../../../../../common/inventory_models/types';
import { useKibanaContextForPlugin } from '../../../../hooks/use_kibana';
import { LogStream } from '../../../log_stream';
import { findInventoryFields } from '../../../../../common/inventory_models';

export interface LogsProps {
  currentTime: number;
  nodeId: string;
  nodeType: InventoryItemType;
}

const TEXT_QUERY_THROTTLE_INTERVAL_MS = 1000;

export const Logs = ({ nodeId, nodeType, currentTime }: LogsProps) => {
  const { services } = useKibanaContextForPlugin();
  const { locators } = services;
  const [textQuery, setTextQuery] = useState('');
  const [textQueryDebounced, setTextQueryDebounced] = useState('');
  const startTimestamp = currentTime - 60 * 60 * 1000; // 60 minutes

  useDebounce(() => setTextQueryDebounced(textQuery), TEXT_QUERY_THROTTLE_INTERVAL_MS, [textQuery]);

  const filter = useMemo(() => {
    const query = [
      `${findInventoryFields(nodeType).id}: "${nodeId}"`,
      ...(textQueryDebounced !== '' ? [textQueryDebounced] : []),
    ].join(' and ');

    return {
      language: 'kuery',
      query,
    };
  }, [nodeType, nodeId, textQueryDebounced]);

  const onQueryChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setTextQuery(e.target.value);
  }, []);

  const logsUrl = useMemo(() => {
    return locators.nodeLogsLocator.getRedirectUrl({
      nodeType,
      nodeId,
      time: startTimestamp,
      filter: textQueryDebounced,
    });
  }, [locators.nodeLogsLocator, nodeId, nodeType, startTimestamp, textQueryDebounced]);

  return (
    <>
      <EuiFlexGroup gutterSize={'m'} alignItems={'center'} responsive={false}>
        <EuiFlexItem>
          <EuiFieldSearch
            data-test-subj="infraTabComponentFieldSearch"
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
              data-test-subj="infraTabComponentOpenInLogsButton"
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
      <LogStream
        logView={{ type: 'log-view-reference', logViewId: 'default' }}
        startTimestamp={startTimestamp}
        endTimestamp={currentTime}
        query={filter}
      />
    </>
  );
};
