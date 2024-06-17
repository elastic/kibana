/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, within } from '@testing-library/react';
import { ManualRuleRunModal } from '.';

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
    const wrapper = render(
      <ManualRuleRunModal onCancel={onCancelMock} onConfirm={onConfirmMock} />
    );

    expect(wrapper.getByTestId('confirmModalConfirmButton')).toBeEnabled();

    within(wrapper.getByTestId('end-date-picker')).getByText('Previous Month').click();

    expect(wrapper.getByTestId('confirmModalConfirmButton')).toBeDisabled();
    expect(wrapper.getByTestId('manual-rule-run-time-range-form')).toHaveTextContent(
      'Selected time range is invalid'
    );
  });

  it('should render confirmation button disabled if selected start date is more than 90 days in the past', () => {
    const wrapper = render(
      <ManualRuleRunModal onCancel={onCancelMock} onConfirm={onConfirmMock} />
    );

    expect(wrapper.getByTestId('confirmModalConfirmButton')).toBeEnabled();

    within(wrapper.getByTestId('start-date-picker')).getByText('Previous Month').click();
    within(wrapper.getByTestId('start-date-picker')).getByText('Previous Month').click();
    within(wrapper.getByTestId('start-date-picker')).getByText('Previous Month').click();
    within(wrapper.getByTestId('start-date-picker')).getByText('Previous Month').click();

    expect(wrapper.getByTestId('confirmModalConfirmButton')).toBeDisabled();
    expect(wrapper.getByTestId('manual-rule-run-time-range-form')).toHaveTextContent(
      'Manual rule run cannot be scheduled earlier than 90 days ago'
    );
  });

  it('should render confirmation button disabled if selected end date is in future', () => {
    const wrapper = render(
      <ManualRuleRunModal onCancel={onCancelMock} onConfirm={onConfirmMock} />
    );

    expect(wrapper.getByTestId('confirmModalConfirmButton')).toBeEnabled();

    within(wrapper.getByTestId('end-date-picker')).getByText('Next month').click();

    expect(wrapper.getByTestId('confirmModalConfirmButton')).toBeDisabled();
    expect(wrapper.getByTestId('manual-rule-run-time-range-form')).toHaveTextContent(
      'Manual rule run cannot be scheduled for the future'
    );
  });
});
