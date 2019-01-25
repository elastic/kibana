/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiDescriptionList,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiPanel,
  EuiTitle,
} from '@elastic/eui';
import React from 'react';
import { pure } from 'recompose';
import { HostsEdges } from 'x-pack/plugins/secops/server/graphql/types';
import { getOrEmpty } from '../../../empty_value';
import * as i18n from './translations';

interface OwnProps {
  data: HostsEdges[];
  loading: boolean;
}

type HostDetailsPanelProps = OwnProps;

export const HostDetailsPanel = pure<HostDetailsPanelProps>(({ data, loading }) => (
  <EuiFlexItem style={{ maxWidth: 600 }}>
    <EuiPanel>
      <EuiTitle size="s">
        <h3>{i18n.HOST}</h3>
      </EuiTitle>

      <EuiHorizontalRule margin="xs" />
      <EuiDescriptionList listItems={getHostDetailsItems(data[0])} type="column" compressed />
    </EuiPanel>
  </EuiFlexItem>
));

const getHostDetailsItems = (host: HostsEdges) => [
  {
    title: i18n.NAME,
    description: getOrEmpty('node.host.name', host),
  },
  {
    title: i18n.LAST_BEAT,
    description: getOrEmpty('node.lastSeen', host),
  },
  {
    title: i18n.ID,
    description: getOrEmpty('node.host.id', host),
  },
  {
    title: i18n.IP_ADDRESS,
    description: getOrEmpty('node.host.ip', host),
  },
  {
    title: i18n.MAC_ADDRESS,
    description: getOrEmpty('node.host.mac', host),
  },
  {
    title: i18n.TYPE,
    description: getOrEmpty('node.lastSeen', host),
  },
  {
    title: i18n.PLATFORM,
    description: getOrEmpty('node.lastSeen', host),
  },
  {
    title: i18n.OS_NAME,
    description: getOrEmpty('node.host.os.name', host),
  },
  {
    title: i18n.FAMILY,
    description: getOrEmpty('node.lastSeen', host),
  },
  {
    title: i18n.VERSION,
    description: getOrEmpty('node.host.os.version', host),
  },
  {
    title: i18n.ARCHITECTURE,
    description: getOrEmpty('node.host.architecture', host),
  },
];
