/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';
import { EuiFieldSearch } from '@elastic/eui';
import { EuiFlexGroup } from '@elastic/eui';
import { EuiFlexItem } from '@elastic/eui';
import { EuiButtonEmpty } from '@elastic/eui';
import { TabContent, TabProps } from './shared';
import { LogStream } from '../../../../../../components/log_stream';
import { useWaffleOptionsContext } from '../../../hooks/use_waffle_options';
import { findInventoryFields } from '../../../../../../../common/inventory_models';
import { euiStyled } from '../../../../../../../../observability/public';
import { useLinkProps } from '../../../../../../hooks/use_link_props';
import { getNodeLogsUrl } from '../../../../../link_to';

const TabComponent = (props: TabProps) => {
  const [textQuery, setTextQuery] = useState('');
  const endTimestamp = props.currentTime;
  const startTimestamp = endTimestamp - 60 * 60 * 1000; // 15 minutes
  const { nodeType } = useWaffleOptionsContext();
  const { options, node } = props;

  const filter = useMemo(() => {
    let query = options.fields
      ? `${findInventoryFields(nodeType, options.fields).id}: "${node.id}"`
      : ``;

    if (textQuery) {
      query += ` and message: ${textQuery}`;
    }
    return query;
  }, [options, nodeType, node.id, textQuery]);

  const onQueryChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setTextQuery(e.target.value);
  }, []);

  const nodeLogsMenuItemLinkProps = useLinkProps(
    getNodeLogsUrl({
      nodeType,
      nodeId: node.id,
      time: startTimestamp,
    })
  );

  return (
    <TabContent>
      <EuiFlexGroup gutterSize={'none'} alignItems="center">
        <EuiFlexItem>
          <QueryWrapper>
            <EuiFieldSearch
              fullWidth
              placeholder={i18n.translate('xpack.infra.nodeDetails.logs.textFieldPlaceholder', {
                defaultMessage: 'Search for log entries...',
              })}
              value={textQuery}
              isClearable
              onChange={onQueryChange}
            />
          </QueryWrapper>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty iconType={'popout'} {...nodeLogsMenuItemLinkProps}>
            <FormattedMessage
              id="xpack.infra.nodeDetails.logs.openLogsLink"
              defaultMessage="Open in Logs"
            />
          </EuiButtonEmpty>
        </EuiFlexItem>
      </EuiFlexGroup>
      <LogStream startTimestamp={startTimestamp} endTimestamp={endTimestamp} query={filter} />
    </TabContent>
  );
};

const QueryWrapper = euiStyled.div`
  padding: ${(props) => props.theme.eui.paddingSizes.m};
  padding-right: 0;
`;

export const LogsTab = {
  id: 'logs',
  name: i18n.translate('xpack.infra.nodeDetails.tabs.logs', {
    defaultMessage: 'Logs',
  }),
  content: TabComponent,
};
