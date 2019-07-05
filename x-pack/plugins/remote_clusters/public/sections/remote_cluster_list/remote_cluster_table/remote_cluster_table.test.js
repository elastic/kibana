/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { Provider } from 'react-redux';
import { renderWithIntl, mountWithIntl } from 'test_utils/enzyme_helpers';
import { findTestSubject } from '@elastic/eui/lib/test';

import { remoteClustersStore } from '../../../store';
import { RemoteClusterTable } from './remote_cluster_table';

// Make sure we have deterministic aria IDs.
jest.mock('@elastic/eui/lib/components/form/form_row/make_id', () => () => 'fakeId');

jest.mock('../../../services', () => {
  const services = require.requireActual('../../../services');
  return {
    ...services,
    getRouterLinkProps: (link) => ({ href: link }),
  };
});

describe('RemoteClusterTable', () => {
  test('renders a row for an API-defined remote cluster', () => {
    const clusters = [{
      name: 'test-cluster',
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

  test('renders a row with a tooltip for a remote cluster defined in elasticsearch.yml', () => {
    const clusters = [{
      name: 'test-cluster-in-elasticsearch-yml',
      seeds: ['seed', 'seed2'],
      isConfiguredByNode: true,
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

  describe('row actions', () => {
    const name = 'test-cluster';

    const clusters = [{
      name,
      seeds: ['seed'],
    }];

    let component;

    beforeEach(() => {
      component = mountWithIntl(
        <Provider store={remoteClustersStore}>
          <RemoteClusterTable
            clusters={clusters}
            openDetailPanel={() => {}}
          />
        </Provider>
      );
    });

    test('name link opens detail panel when clicked', () => {
      const rowName = findTestSubject(component, `remoteClusterTableRowName-${name}`);
      rowName.simulate('click');
      const detailPanel = findTestSubject(component, 'remoteClusterDetailFlyout');
      expect(detailPanel).toBeTruthy();
    });

    test('remove button displays a confirmation modal when clicked', () => {
      const removeButton = findTestSubject(component, `remoteClusterTableRowRemoveButton-${name}`);
      removeButton.simulate('click');
      const confirmModal = findTestSubject(component, 'remoteClustersDeleteConfirmModal');
      expect(confirmModal).toBeTruthy();
    });
  });
});
