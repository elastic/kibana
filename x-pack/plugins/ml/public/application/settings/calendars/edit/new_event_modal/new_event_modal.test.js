/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shallowWithIntl } from 'test_utils/enzyme_helpers';
import React from 'react';
import { NewEventModal } from './new_event_modal';
import moment from 'moment';

const testProps = {
  closeModal: jest.fn(),
  addEvent: jest.fn(),
};

const stateTimestamps = {
  startDate: 1544508000000,
  endDate: 1544594400000,
};

describe('NewEventModal', () => {
  it('Add button disabled if description empty', () => {
    const wrapper = shallowWithIntl(<NewEventModal {...testProps} />);

    const addButton = wrapper.find('EuiButton').first();
    expect(addButton.prop('disabled')).toBe(true);
  });

  it('if endDate is less than startDate should set startDate one day before endDate', () => {
    const wrapper = shallowWithIntl(<NewEventModal {...testProps} />);
    const instance = wrapper.instance();
    instance.setState({
      startDate: moment(stateTimestamps.startDate),
      endDate: moment(stateTimestamps.endDate),
    });
    // set to Dec 11, 2018 and Dec 12, 2018
    const startMoment = moment(stateTimestamps.startDate);
    const endMoment = moment(stateTimestamps.endDate);
    // make startMoment greater than current end Date
    startMoment.startOf('day').add(3, 'days');
    // trigger handleChangeStart directly with startMoment
    instance.handleChangeStart(startMoment);
    // add 3 days to endMoment as it will be adjusted to be one day after startDate
    const expected = endMoment.startOf('day').add(3, 'days').format();

    expect(wrapper.state('endDate').format()).toBe(expected);
  });

  it('if startDate is greater than endDate should set endDate one day after startDate', () => {
    const wrapper = shallowWithIntl(<NewEventModal {...testProps} />);
    const instance = wrapper.instance();
    instance.setState({
      startDate: moment(stateTimestamps.startDate),
      endDate: moment(stateTimestamps.endDate),
    });

    // set to Dec 11, 2018 and Dec 12, 2018
    const startMoment = moment(stateTimestamps.startDate);
    const endMoment = moment(stateTimestamps.endDate);
    // make endMoment less than current start Date
    endMoment.startOf('day').subtract(3, 'days');
    // trigger handleChangeStart directly with endMoment
    instance.handleChangeStart(endMoment);
    // subtract 3 days from startDate as it will be adjusted to be one day before endDate
    const expected = startMoment.startOf('day').subtract(2, 'days').format();

    expect(wrapper.state('startDate').format()).toBe(expected);
  });
});
