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
import { EuiFieldSearch } from '@elastic/eui';
import { EuiFlexGroup } from '@elastic/eui';
import { EuiFlexItem } from '@elastic/eui';
import { EuiButtonEmpty } from '@elastic/eui';
import { RedirectAppLinks } from '@kbn/shared-ux-link-redirect-app';
import { LogStream } from '@kbn/logs-shared-plugin/public';
import { useKibanaContextForPlugin } from '../../../../../../hooks/use_kibana';
import { TabContent, TabProps } from './shared';
import { useWaffleOptionsContext } from '../../../hooks/use_waffle_options';
import { findInventoryFields } from '../../../../../../../common/inventory_models';

const TabComponent = (props: TabProps) => {
  const { services } = useKibanaContextForPlugin();
  const { locators } = services;
  const [textQuery, setTextQuery] = useState('');
  const [textQueryDebounced, setTextQueryDebounced] = useState('');
  const endTimestamp = props.currentTime;
  const startTimestamp = endTimestamp - 60 * 60 * 1000; // 60 minutes
  const { nodeType } = useWaffleOptionsContext();
  const { node } = props;

  useDebounce(() => setTextQueryDebounced(textQuery), textQueryThrottleInterval, [textQuery]);

  const filter = useMemo(() => {
    const query = [
      `${findInventoryFields(nodeType).id}: "${node.id}"`,
      ...(textQueryDebounced !== '' ? [textQueryDebounced] : []),
    ].join(' and ');

    return {
      language: 'kuery',
      query,
    };
  }, [nodeType, node.id, textQueryDebounced]);

  const onQueryChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setTextQuery(e.target.value);
  }, []);

  const logsUrl = useMemo(() => {
    return locators.nodeLogsLocator.getRedirectUrl({
      nodeType,
      nodeId: node.id,
      time: startTimestamp,
      filter: textQueryDebounced,
    });
  }, [locators.nodeLogsLocator, node.id, nodeType, startTimestamp, textQueryDebounced]);

  return (
    <TabContent>
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
              size={'xs'}
              flush={'both'}
              iconType={'popout'}
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
        endTimestamp={endTimestamp}
        query={filter}
      />
    </TabContent>
  );
};

export const LogsTab = {
  id: 'logs',
  name: i18n.translate('xpack.infra.nodeDetails.tabs.logs', {
    defaultMessage: 'Logs',
  }),
  content: TabComponent,
};

const textQueryThrottleInterval = 1000; // milliseconds
