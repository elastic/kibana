/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import '@kbn/code-editor-mock/jest_helper';
import { shallowWithIntl } from '@kbn/test-jest-helpers';

import { RemoteClusterComboBox } from './remote_clusters_combo_box';

test('it renders without crashing', () => {
  const wrapper = shallowWithIntl(
    <RemoteClusterComboBox
      type="remote_cluster"
      dat-test-subj="remoteClusterClustersInput0"
      remoteClusters={[
        {
          name: 'test1',
          mode: 'proxy',
          isConnected: false,
          initialConnectTimeout: '30s',
          skipUnavailable: false,
          proxyAddress: 'localhost:9400',
          proxySocketConnections: 18,
          connectedSocketsCount: 0,
          serverName: 'localhost',
          securityModel: 'certificate',
        },
        {
          name: 'test2',
          mode: 'proxy',
          isConnected: false,
          initialConnectTimeout: '30s',
          skipUnavailable: false,
          proxyAddress: 'localhost:9400',
          proxySocketConnections: 18,
          connectedSocketsCount: 0,
          serverName: 'localhost',
          securityModel: 'api_key',
        },
        {
          name: 'test3',
          mode: 'proxy',
          isConnected: false,
          initialConnectTimeout: '30s',
          skipUnavailable: false,
          proxyAddress: 'localhost:9400',
          proxySocketConnections: 18,
          connectedSocketsCount: 0,
          serverName: 'localhost',
          securityModel: 'api_key',
        },
      ]}
    />
  );
  expect(wrapper).toMatchSnapshot();
});

test('should render clusters field', () => {
  const wrapper = shallowWithIntl(
    <RemoteClusterComboBox
      onChange={jest.fn()}
      type="remote_cluster"
      remoteClusters={[
        {
          name: 'test1',
          mode: 'proxy',
          isConnected: false,
          initialConnectTimeout: '30s',
          skipUnavailable: false,
          proxyAddress: 'localhost:9400',
          proxySocketConnections: 18,
          connectedSocketsCount: 0,
          serverName: 'localhost',
          securityModel: 'certificate',
        },
        {
          name: 'test2',
          mode: 'proxy',
          isConnected: false,
          initialConnectTimeout: '30s',
          skipUnavailable: false,
          proxyAddress: 'localhost:9400',
          proxySocketConnections: 18,
          connectedSocketsCount: 0,
          serverName: 'localhost',
          securityModel: 'api_key',
        },
      ]}
    />
  );
  const clustersInput = wrapper.find('EuiComboBox');
  expect(clustersInput.prop('options')).toEqual([
    { label: 'test2' },
    { label: expect.anything(), isGroupLabelOption: true },
    {
      label: 'test1',
      disabled: true,
      append: expect.anything(),
    },
  ]);
});
