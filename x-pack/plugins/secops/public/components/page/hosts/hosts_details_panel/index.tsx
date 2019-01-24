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
import * as i18n from './translations';

const hostDetailsItems = [
  {
    title: i18n.NAME,
    description: 'seconds_ago',
  },
  {
    title: i18n.LAST_BEAT,
    description: 'idddd',
  },
  {
    title: i18n.ID,
    description: 'host_name',
  },
  {
    title: i18n.IP_ADDRESS,
    description: 'seconds_ago',
  },
  {
    title: i18n.MAC_ADDRESS,
    description: 'idddd',
  },
  {
    title: i18n.TYPE,
    description: 'idddd',
  },
  {
    title: i18n.PLATFORM,
    description: 'idddd',
  },
  {
    title: i18n.OS_NAME,
    description: 'idddd',
  },
  {
    title: i18n.FAMILY,
    description: 'idddd',
  },
  {
    title: i18n.VERSION,
    description: 'idddd',
  },
  {
    title: i18n.ARCHITECTURE,
    description: 'idddd',
  },
];

export const HostDetailsPanel = pure(() => (
  <EuiFlexItem style={{ maxWidth: 400 }}>
    <EuiPanel>
      <EuiTitle size="s">
        <h3>{i18n.HOST}</h3>
      </EuiTitle>

      <EuiHorizontalRule margin="xs" />

      <EuiDescriptionList listItems={hostDetailsItems} type="column" compressed />
    </EuiPanel>
  </EuiFlexItem>
));
