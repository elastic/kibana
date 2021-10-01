/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { shallow } from 'enzyme';

import { CurationActionsPopover } from './curation_actions_popover';

describe('CurationActionsPopover', () => {
  const handleAccept = jest.fn();
  const handleAutomate = jest.fn();
  const handleReject = jest.fn();
  const handleTurnOff = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders', () => {
    const wrapper = shallow(
      <CurationActionsPopover
        onAccept={handleAccept}
        onAutomate={handleAutomate}
        onReject={handleReject}
        onTurnOff={handleTurnOff}
      />
    );
    expect(wrapper.isEmptyRender()).toBe(false);

    wrapper.find('[data-test-subj="acceptButton"]').simulate('click');
    expect(handleAccept).toHaveBeenCalled();

    wrapper.find('[data-test-subj="automateButton"]').simulate('click');
    expect(handleAutomate).toHaveBeenCalled();

    wrapper.find('[data-test-subj="rejectButton"]').simulate('click');
    expect(handleReject).toHaveBeenCalled();

    wrapper.find('[data-test-subj="turnoffButton"]').simulate('click');
    expect(handleTurnOff).toHaveBeenCalled();
  });

  it('can open and close', () => {
    const wrapper = shallow(
      <CurationActionsPopover
        onAccept={handleAccept}
        onAutomate={handleAutomate}
        onReject={handleReject}
        onTurnOff={handleTurnOff}
      />
    );

    expect(wrapper.prop('isOpen')).toBe(false);

    const button = shallow(wrapper.prop('button'));
    button.simulate('click');

    expect(wrapper.prop('isOpen')).toBe(true);

    wrapper.prop('closePopover')();

    expect(wrapper.prop('isOpen')).toBe(false);
  });
});
