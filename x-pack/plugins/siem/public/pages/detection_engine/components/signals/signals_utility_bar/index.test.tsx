/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { shallow } from 'enzyme';

import { SignalsUtilityBar } from './index';

jest.mock('../../../../../lib/kibana');

describe('SignalsUtilityBar', () => {
  it('renders correctly', () => {
    const wrapper = shallow(
      <SignalsUtilityBar
        canUserCRUD={true}
        hasIndexWrite={true}
        areEventsLoading={false}
        clearSelection={jest.fn()}
        totalCount={100}
        selectedEventIds={{}}
        isFilteredToOpen={false}
        selectAll={jest.fn()}
        showClearSelection={true}
        updateSignalsStatus={jest.fn()}
      />
    );

    expect(wrapper.find('[dataTestSubj="openCloseSignal"]')).toBeTruthy();
  });
});
