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
import { DetailPanel } from './detail_panel';

// Make sure we have deterministic aria IDs.
jest.mock('@elastic/eui/lib/components/form/form_row/make_id', () => () => 'fakeId');

jest.mock('../../../services', () => {
  const services = require.requireActual('../../../services');
  return {
    ...services,
    getRouterLinkProps: (link) => ({ href: link }),
  };
});

describe('DetailPanel', () => {
  const name = 'test-cluster';

  const cluster = {
    name,
    seeds: ['seed'],
  };

  describe('is rendered', () => {
    const component = renderWithIntl(
      <Provider store={remoteClustersStore}>
        <DetailPanel
          isOpen={true}
          cluster={cluster}
          clusterName={name}
          closeDetailPanel={() => {}}
        />
      </Provider>
    );

    expect(component).toMatchSnapshot();
  });

  describe('actions', () => {
    test('remove button displays a confirmation modal when clicked', () => {
      const component = mountWithIntl(
        <Provider store={remoteClustersStore}>
          <DetailPanel
            isOpen={true}
            cluster={cluster}
            clusterName={name}
            closeDetailPanel={() => {}}
          />
        </Provider>
      );

      const rowName = findTestSubject(component, 'remoteClusterDetailPanelRemoveButton');
      rowName.simulate('click');
      const confirmModal = findTestSubject(component, 'remoteClustersDeleteConfirmModal');
      expect(confirmModal).toBeTruthy();
    });
  });
});
