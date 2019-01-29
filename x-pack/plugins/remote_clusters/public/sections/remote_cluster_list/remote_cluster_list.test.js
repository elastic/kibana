/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { Provider } from 'react-redux';
import { mountWithIntl } from 'test_utils/enzyme_helpers';
import { findTestSubject } from '@elastic/eui/lib/test';

import { remoteClustersStore } from '../../store';
import { RemoteClusterList } from './remote_cluster_list';

jest.mock('ui/chrome', () => ({
  addBasePath: () => {},
  breadcrumbs: {
    set: () => {},
  },
}));

jest.mock('../../services', () => {
  const services = require.requireActual('../../services');
  return {
    ...services,
    getRouterLinkProps: (link) => ({ href: link }),
  };
});

describe('RemoteClusterList', () => {
  test('renders empty prompt when loading is complete and there are no clusters', () => {
    const component = mountWithIntl(
      <Provider store={remoteClustersStore}>
        <RemoteClusterList
          loadClusters={() => {}}
          refreshClusters={() => {}}
          openDetailPanel={() => {}}
          closeDetailPanel={() => {}}
          isDetailPanelOpen={false}
          clusters={[]}
          isLoading={false}
          isCopyingCluster={false}
          isRemovingCluster={false}
          history={{ location: { search: '' } }}
        />
      </Provider>
    );

    const emptyPrompt = findTestSubject(component, 'remoteClusterListEmptyPrompt');
    expect(emptyPrompt).toBeTruthy();
  });
});
