/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { TabContent, TabProps } from './shared';
import { LogStream } from '../../../../../../components/log_stream';
import { useWaffleOptionsContext } from '../../../hooks/use_waffle_options';
import { findInventoryFields } from '../../../../../../../common/inventory_models';

const TabComponent = (props: TabProps) => {
  const endTimestamp = Date.now();
  const startTimestamp = endTimestamp - 15 * 60 * 1000; // 15 minutes
  const { nodeType } = useWaffleOptionsContext();
  const { options, node } = props;

  const filter = options.fields
    ? `${findInventoryFields(nodeType, options.fields).id}: "${node.id}"`
    : '';
  return (
    <TabContent>
      <LogStream startTimestamp={startTimestamp} endTimestamp={endTimestamp} query={filter} />
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
