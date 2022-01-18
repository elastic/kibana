/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { mount, ReactWrapper } from 'enzyme';
import { UserActionMoveToReference } from './move_to_reference';

const outlineComment = jest.fn();
const props = {
  id: 'move-to-ref-id',
  outlineComment,
};

describe('UserActionMoveToReference ', () => {
  let wrapper: ReactWrapper;

  beforeAll(() => {
    wrapper = mount(<UserActionMoveToReference {...props} />);
  });

  it('it renders', async () => {
    expect(
      wrapper.find(`[data-test-subj="move-to-link-${props.id}"]`).first().exists()
    ).toBeTruthy();
  });

  it('calls outlineComment correctly', async () => {
    wrapper.find(`[data-test-subj="move-to-link-${props.id}"]`).first().simulate('click');
    expect(outlineComment).toHaveBeenCalledWith(props.id);
  });
});
