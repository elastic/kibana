/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { mount } from 'enzyme';

import { ExceptionsViewerUtility } from './utility_bar';
import { TestProviders } from '../../../../common/mock';

jest.mock('@kbn/i18n-react', () => {
  const { i18n } = jest.requireActual('@kbn/i18n');
  i18n.init({ locale: 'en' });

  const originalModule = jest.requireActual('@kbn/i18n-react');
  const FormattedRelative = jest.fn();
  FormattedRelative.mockImplementation(() => '20 hours ago');

  return {
    ...originalModule,
    FormattedRelative,
  };
});

describe('ExceptionsViewerUtility', () => {
  it('it renders correct item counts', () => {
    const wrapper = mount(
      <TestProviders>
        <ExceptionsViewerUtility
          pagination={{
            pageIndex: 0,
            pageSize: 50,
            totalItemCount: 105,
            pageSizeOptions: [5, 10, 20, 50, 100],
          }}
          exceptionsToShow={{ active: true }}
          onChangeExceptionsToShow={(optionId: string) => {}}
          lastUpdated={1660534202}
          isEndpoint={false}
        />
      </TestProviders>
    );

    expect(wrapper.find('[data-test-subj="exceptionsShowing"]').at(0).text()).toEqual(
      'Showing 1-50 of 105'
    );
  });

  it('it renders last updated message', () => {
    const wrapper = mount(
      <TestProviders>
        <ExceptionsViewerUtility
          pagination={{
            pageIndex: 0,
            pageSize: 50,
            totalItemCount: 1,
            pageSizeOptions: [5, 10, 20, 50, 100],
          }}
          exceptionsToShow={{ active: true }}
          onChangeExceptionsToShow={(optionId: string) => {}}
          lastUpdated={Date.now()}
          isEndpoint={false}
        />
      </TestProviders>
    );

    expect(wrapper.find('[data-test-subj="exceptionsViewerLastUpdated"]').at(0).text()).toEqual(
      'Updated 20 hours ago'
    );
  });
});
