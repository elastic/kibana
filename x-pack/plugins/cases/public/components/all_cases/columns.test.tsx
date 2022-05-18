/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { mount } from 'enzyme';

import '../../common/mock/match_media';
import { ExternalServiceColumn } from './columns';
import { useGetCasesMockState } from '../../containers/mock';
import { connectors } from '../configure_cases/__mock__';
import { AppMockRenderer, createAppMockRenderer, TestProviders } from '../../common/mock';

describe('ExternalServiceColumn ', () => {
  let appMockRender: AppMockRenderer;
  beforeEach(() => {
    jest.clearAllMocks();
    appMockRender = createAppMockRenderer();
  });

  it('Not pushed render', () => {
    const wrapper = mount(
      <TestProviders>
        <ExternalServiceColumn
          theCase={useGetCasesMockState.data.cases[0]}
          connectors={connectors}
        />
      </TestProviders>
    );
    expect(
      wrapper.find(`[data-test-subj="case-table-column-external-notPushed"]`).last().exists()
    ).toBeTruthy();
  });

  it('Up to date', () => {
    const wrapper = mount(
      <TestProviders>
        <ExternalServiceColumn
          theCase={useGetCasesMockState.data.cases[1]}
          connectors={connectors}
        />
      </TestProviders>
    );
    expect(
      wrapper.find(`[data-test-subj="case-table-column-external-upToDate"]`).last().exists()
    ).toBeTruthy();
  });

  it('Needs update', () => {
    const wrapper = mount(
      <TestProviders>
        <ExternalServiceColumn
          theCase={useGetCasesMockState.data.cases[2]}
          connectors={connectors}
        />
      </TestProviders>
    );
    expect(
      wrapper.find(`[data-test-subj="case-table-column-external-requiresUpdate"]`).last().exists()
    ).toBeTruthy();
  });

  it('it does not throw when accessing the icon if the connector type is not registered', () => {
    // If the component throws the test will fail
    expect(() =>
      mount(
        <TestProviders>
          <ExternalServiceColumn
            theCase={useGetCasesMockState.data.cases[2]}
            connectors={[
              {
                id: 'none',
                actionTypeId: '.none',
                name: 'None',
                config: {},
                isPreconfigured: false,
              },
            ]}
          />
        </TestProviders>
      )
    ).not.toThrowError();
  });

  it('shows the connectors icon if the user has read access to actions', async () => {
    const result = appMockRender.render(
      <ExternalServiceColumn theCase={useGetCasesMockState.data.cases[1]} connectors={connectors} />
    );

    expect(result.getByTestId('cases-table-connector-icon')).toBeInTheDocument();
  });

  it('hides the connectors icon if the user does not have read access to actions', async () => {
    appMockRender.coreStart.application.capabilities = {
      ...appMockRender.coreStart.application.capabilities,
      actions: { save: false, show: false },
    };

    const result = appMockRender.render(
      <ExternalServiceColumn theCase={useGetCasesMockState.data.cases[1]} connectors={connectors} />
    );

    expect(result.queryByTestId('cases-table-connector-icon')).toBe(null);
  });
});
