/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { Provider } from 'react-redux';
import { renderWithIntl } from 'test_utils/enzyme_helpers';

import { remoteClustersStore } from '../../../store';
import { RemoteClusterTable } from './remote_cluster_table';

jest.mock('@elastic/eui', () => {
  const eui = require.requireActual('@elastic/eui');
  return {
    ...eui,
    // Prevent non-deterministic aria IDs from breaking snapshots on each run.
    EuiToolTip: ({ children }) => (
      <div>{children}</div>
    ),
  };
});

describe('RemoteClusterTable', () => {
  test(`renders a row for a default remote cluster`, () => {
    const clusters = [{
      name: 'Default remote cluster',
      seeds: ['seed', 'seed2'],
    }];

    const component = renderWithIntl(
      <Provider store={remoteClustersStore}>
        <RemoteClusterTable
          clusters={clusters}
          openDetailPanel={() => {}}
        />
      </Provider>
    );

    expect(component.find('tbody > tr').first()).toMatchSnapshot();
  });

  // TODO: Re-enable this test once EUI supports stubbing its dynamically generated IDs (eui#1381)
  // test(`renders a row for a remote cluster defined in elasticsearch.yml`, () => {
  //   const clusters = [{
  //     name: 'Remote cluster in elasticsearch.yml',
  //     seeds: ['seed', 'seed2'],
  //     isConfiguredByNode: true,
  //   }];

  //   const component = renderWithIntl(
  //     <Provider store={remoteClustersStore}>
  //       <RemoteClusterTable
  //         clusters={clusters}
  //         openDetailPanel={() => {}}
  //       />
  //     </Provider>
  //   );

  //   expect(component.find('tbody > tr').first()).toMatchSnapshot();
  // });
});
