/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { shallow } from 'enzyme';

import { GenericConfirmationModal } from './generic_confirmation_modal';

describe('GenericConfirmationModal', () => {
  let wrapper: any;
  const onClose = jest.fn();
  const onSave = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    wrapper = shallow(
      <GenericConfirmationModal
        title="A title"
        subheading="A subheading"
        description="A description"
        target="DISABLE"
        onClose={onClose}
        onSave={onSave}
      />
    );
  });

  it('calls onSave callback when save is pressed', () => {
    const button = wrapper.find('[data-test-subj="GenericConfirmationModalSave"]');
    button.simulate('click');
    expect(onSave).toHaveBeenCalled();
  });

  it('calls onClose callback when Cancel is pressed', () => {
    const button = wrapper.find('[data-test-subj="GenericConfirmationModalCancel"]');
    button.simulate('click');
    expect(onClose).toHaveBeenCalled();
  });

  it('disables the Save button when the input is empty', () => {
    const button = wrapper.find('[data-test-subj="GenericConfirmationModalSave"]');
    expect(button.prop('disabled')).toEqual(true);
  });

  it('disables the Save button when the input is not equal to the target', () => {
    const input = wrapper.find('[data-test-subj="GenericConfirmationModalInput"]');
    input.prop('onChange')({
      target: {
        value: 'NOT_GOOD',
      },
    });

    const button = wrapper.find('[data-test-subj="GenericConfirmationModalSave"]');
    expect(button.prop('disabled')).toEqual(true);
  });

  it('enables the Save button when the current input equals the target prop', () => {
    const input = wrapper.find('[data-test-subj="GenericConfirmationModalInput"]');
    input.prop('onChange')({
      target: {
        value: 'DISABLE',
      },
    });
    const button = wrapper.find('[data-test-subj="GenericConfirmationModalSave"]');
    expect(button.prop('disabled')).toEqual(false);
  });

  it('is not case sensitive', () => {
    const input = wrapper.find('[data-test-subj="GenericConfirmationModalInput"]');
    input.prop('onChange')({
      target: {
        value: 'diSable',
      },
    });
    const button = wrapper.find('[data-test-subj="GenericConfirmationModalSave"]');
    expect(button.prop('disabled')).toEqual(false);
  });
});
