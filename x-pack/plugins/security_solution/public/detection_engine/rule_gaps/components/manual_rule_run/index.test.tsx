/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { ManualRuleRunModal } from '.';

const DATE_PICKER_PREVIOUS_BTN_CLASS = '.react-datepicker__navigation--previous';
const DATE_PICKER_NEXT_BTN_CLASS = '.react-datepicker__navigation--next';

describe('ManualRuleRunModal', () => {
  const onCancelMock = jest.fn();
  const onConfirmMock = jest.fn();

  let startDatePicker: HTMLElement;
  let endDatePicker: HTMLElement;
  let confirmModalConfirmButton: HTMLElement;
  let cancelModalConfirmButton: HTMLElement;
  let timeRangeForm: HTMLElement;

  afterEach(() => {
    onCancelMock.mockReset();
    onConfirmMock.mockReset();
  });

  beforeEach(() => {
    // This is an attempt to fix the "TypeError: scrollIntoView is not a function" error
    // According to https://stackoverflow.com/a/53294906 the `scrollIntoView` is not implemented in jsdom,
    // and proposed solution is coming from https://github.com/jsdom/jsdom/issues/1695
    window.HTMLElement.prototype.scrollIntoView = () => {};

    render(<ManualRuleRunModal onCancel={onCancelMock} onConfirm={onConfirmMock} />);

    startDatePicker = screen.getByTestId('start-date-picker');
    endDatePicker = screen.getByTestId('end-date-picker');
    confirmModalConfirmButton = screen.getByTestId('confirmModalConfirmButton');
    cancelModalConfirmButton = screen.getByTestId('confirmModalCancelButton');
    timeRangeForm = screen.getByTestId('manual-rule-run-time-range-form');
  });

  it('should render modal', () => {
    expect(timeRangeForm).toBeInTheDocument();
    expect(cancelModalConfirmButton).toBeEnabled();
    expect(confirmModalConfirmButton).toBeEnabled();
  });

  it('should render confirmation button disabled if invalid time range has been selected', () => {
    expect(confirmModalConfirmButton).toBeEnabled();

    fireEvent.click(endDatePicker.querySelector(DATE_PICKER_PREVIOUS_BTN_CLASS)!);

    expect(confirmModalConfirmButton).toBeDisabled();
    expect(timeRangeForm).toHaveTextContent('Selected time range is invalid');
  });

  it('should render confirmation button disabled if selected start date is more than 90 days in the past', () => {
    expect(confirmModalConfirmButton).toBeEnabled();

    fireEvent.click(startDatePicker.querySelector(DATE_PICKER_PREVIOUS_BTN_CLASS)!);
    fireEvent.click(startDatePicker.querySelector(DATE_PICKER_PREVIOUS_BTN_CLASS)!);
    fireEvent.click(startDatePicker.querySelector(DATE_PICKER_PREVIOUS_BTN_CLASS)!);
    fireEvent.click(startDatePicker.querySelector(DATE_PICKER_PREVIOUS_BTN_CLASS)!);

    expect(confirmModalConfirmButton).toBeDisabled();
    expect(timeRangeForm).toHaveTextContent(
      'Manual rule run cannot be scheduled earlier than 90 days ago'
    );
  });

  it('should render confirmation button disabled if selected end date is in future', () => {
    expect(confirmModalConfirmButton).toBeEnabled();

    fireEvent.click(endDatePicker.querySelector(DATE_PICKER_NEXT_BTN_CLASS)!);

    expect(confirmModalConfirmButton).toBeDisabled();
    expect(timeRangeForm).toHaveTextContent('Manual rule run cannot be scheduled for the future');
  });
});
