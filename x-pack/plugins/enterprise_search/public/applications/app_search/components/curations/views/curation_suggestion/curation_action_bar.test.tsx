/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { shallow } from 'enzyme';

import { CurationActionBar } from './curation_action_bar';

describe('CurationActionBar', () => {
  const handleAcceptClick = jest.fn();
  const handleRejectClick = jest.fn();

  it('renders', () => {
    const wrapper = shallow(
      <CurationActionBar onAcceptClick={handleAcceptClick} onRejectClick={handleRejectClick} />
    );

    wrapper.find('[data-test-subj="rejectButton"]').simulate('click');
    expect(handleRejectClick).toHaveBeenCalled();

    wrapper.find('[data-test-subj="acceptButton"]').simulate('click');
    expect(handleAcceptClick).toHaveBeenCalled();
  });
});
