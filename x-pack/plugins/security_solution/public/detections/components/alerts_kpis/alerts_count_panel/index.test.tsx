/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { waitFor, act } from '@testing-library/react';

import { mount } from 'enzyme';
import * as esQuery from '@kbn/es-query';

import { TestProviders } from '../../../../common/mock';

import { AlertsCountPanel } from './index';

describe('AlertsCountPanel', () => {
  const defaultProps = {
    signalIndexName: 'signalIndexName',
  };

  it('renders correctly', async () => {
    await act(async () => {
      const wrapper = mount(
        <TestProviders>
          <AlertsCountPanel {...defaultProps} />
        </TestProviders>
      );

      expect(wrapper.find('[data-test-subj="alertsCountPanel"]').exists()).toBeTruthy();
    });
  });

  describe('Query', () => {
    it('it render with a illegal KQL', async () => {
      const spyOnBuildEsQuery = jest.spyOn(esQuery, 'buildEsQuery');
      spyOnBuildEsQuery.mockImplementation(() => {
        throw new Error('Something went wrong');
      });
      const props = { ...defaultProps, query: { query: 'host.name: "', language: 'kql' } };
      const wrapper = mount(
        <TestProviders>
          <AlertsCountPanel {...props} />
        </TestProviders>
      );

      await waitFor(() => {
        expect(wrapper.find('[data-test-subj="alertsCountPanel"]').exists()).toBeTruthy();
      });
    });
  });
});
