/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { IncludeExpiredExceptionsModal } from '.';
import { fireEvent, render } from '@testing-library/react';

describe('IncludeExpiredExceptionsModal', () => {
  const handleCloseModal = jest.fn();
  const onModalConfirm = jest.fn();

  it('should call handleCloseModal on cancel click', () => {
    const wrapper = render(
      <IncludeExpiredExceptionsModal
        handleCloseModal={handleCloseModal}
        onModalConfirm={onModalConfirm}
        action={'export'}
      />
    );
    fireEvent.click(wrapper.getByTestId('confirmModalCancelButton'));
    expect(handleCloseModal).toHaveBeenCalled();
  });

  it('should call onModalConfirm on confirm click', () => {
    const wrapper = render(
      <IncludeExpiredExceptionsModal
        handleCloseModal={handleCloseModal}
        onModalConfirm={onModalConfirm}
        action={'duplicate'}
      />
    );
    fireEvent.click(wrapper.getByTestId('confirmModalConfirmButton'));
    expect(onModalConfirm).toHaveBeenCalled();
  });
});
