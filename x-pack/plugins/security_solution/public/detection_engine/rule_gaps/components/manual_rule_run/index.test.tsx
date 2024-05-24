/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { mount } from 'enzyme';
import { render } from '@testing-library/react';
import { ManualRuleRunModal } from '.';
import { TestProviders } from '../../../../common/mock';

describe('ManualRuleRunModal', () => {
  const onCancelMock = jest.fn();
  const onConfirmMock = jest.fn();

  afterEach(() => {
    onCancelMock.mockReset();
    onConfirmMock.mockReset();
  });

  it('should render modal', () => {
    const wrapper = render(
      <ManualRuleRunModal onCancel={onCancelMock} onConfirm={onConfirmMock} />
    );

    expect(wrapper.getByTestId('manual-rule-run-modal-form')).toBeInTheDocument();
    expect(wrapper.getByTestId('confirmModalCancelButton')).toBeEnabled();
    expect(wrapper.getByTestId('confirmModalConfirmButton')).toBeEnabled();
  });

  it('should render confirmation button disabled if invalid time range has been selected', () => {
    const wrapper = mount(
      <TestProviders>
        <ManualRuleRunModal onCancel={onCancelMock} onConfirm={onConfirmMock} />
      </TestProviders>
    );

    expect(
      wrapper.find('[data-test-subj="confirmModalConfirmButton"] button').prop('disabled')
    ).toBe(false);

    wrapper
      .find('[data-test-subj="end-date-picker"]')
      .find('button.react-datepicker__navigation--previous')
      .first()
      .simulate('click');

    expect(
      wrapper.find('[data-test-subj="confirmModalConfirmButton"] button').prop('disabled')
    ).toBe(true);
  });
});
