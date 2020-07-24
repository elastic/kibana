/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { shallow } from 'enzyme';

import { AlertsUtilityBar } from './index';

jest.mock('../../../../common/lib/kibana');

describe('AlertsUtilityBar', () => {
  it('renders correctly', () => {
    const wrapper = shallow(
      <AlertsUtilityBar
        canUserCRUD={true}
        hasIndexWrite={true}
        areEventsLoading={false}
        clearSelection={jest.fn()}
        totalCount={100}
        selectedEventIds={{}}
        currentFilter="closed"
        selectAll={jest.fn()}
        showClearSelection={true}
        showBuildingBlockAlerts={false}
        onShowBuildingBlockAlertsChanged={jest.fn()}
        updateAlertsStatus={jest.fn()}
      />
    );

    expect(wrapper.find('[dataTestSubj="alertActionPopover"]')).toBeTruthy();
  });
});
