/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { renderWithIntl } from 'test_utils/enzyme_helpers';

import { RemoteClusterList } from './remote_cluster_list';

jest.mock('../../services', () => {
  const services = require.requireActual('../../services');
  return {
    ...services,
    getRouterLinkProps: (link) => ({ href: link }),
  };
});

describe('RemoteClusterList', () => {
  test(`renders empty prompt when loading is complete and there are no clusters`, () => {
    const component = renderWithIntl(
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
    );
    expect(component).toMatchSnapshot();
  });
});
