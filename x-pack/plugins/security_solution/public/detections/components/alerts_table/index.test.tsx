/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { shallow } from 'enzyme';

import '../../../common/mock/match_media';
import { TestProviders, TestProvidersComponent } from '../../../common/mock';
import { AlertsTableComponent } from '.';
import { TableId } from '../../../../common/types';
import { render, waitFor, screen, fireEvent } from '@testing-library/react';

const clickOnSelectGroupField = () => {
  const selectGroupButton = screen.getByTestId('alerts-table-group-selector');
  fireEvent.click(selectGroupButton);
};

describe('AlertsTableComponent', () => {
  it('renders correctly', () => {
    const wrapper = shallow(
      <TestProviders>
        <AlertsTableComponent
          tableId={TableId.test}
          hasIndexWrite
          hasIndexMaintenance
          from={'2020-07-07T08:20:18.966Z'}
          loading
          to={'2020-07-08T08:20:18.966Z'}
          globalQuery={{
            query: 'query',
            language: 'language',
          }}
          globalFilters={[]}
          loadingEventIds={[]}
          isSelectAllChecked={false}
          showBuildingBlockAlerts={false}
          onShowBuildingBlockAlertsChanged={jest.fn()}
          showOnlyThreatIndicatorAlerts={false}
          onShowOnlyThreatIndicatorAlertsChanged={jest.fn()}
          dispatch={jest.fn()}
          runtimeMappings={{}}
          signalIndexName={'test'}
        />
      </TestProviders>
    );

    expect(wrapper.find('[title="Alerts"]')).toBeTruthy();
  });

  it('it renders groupped alerts when grouping field is selected', async () => {
    render(
      <TestProvidersComponent>
        <AlertsTableComponent
          tableId={TableId.test}
          hasIndexWrite
          hasIndexMaintenance
          from={'2020-07-07T08:20:18.966Z'}
          loading
          to={'2020-07-08T08:20:18.966Z'}
          globalQuery={{
            query: 'query',
            language: 'language',
          }}
          globalFilters={[]}
          loadingEventIds={[]}
          isSelectAllChecked={false}
          showBuildingBlockAlerts={false}
          onShowBuildingBlockAlertsChanged={jest.fn()}
          showOnlyThreatIndicatorAlerts={false}
          onShowOnlyThreatIndicatorAlertsChanged={jest.fn()}
          dispatch={jest.fn()}
          runtimeMappings={{}}
          signalIndexName={'test'}
        />
      </TestProvidersComponent>
    );

    clickOnSelectGroupField();
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeVisible();
    });
  });
});
