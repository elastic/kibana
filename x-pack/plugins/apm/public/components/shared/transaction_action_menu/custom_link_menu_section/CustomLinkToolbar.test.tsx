/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, fireEvent, render } from '@testing-library/react';
import React, { ReactNode } from 'react';
import { MockApmAppContextProvider } from '../../../../context/mock_apm_app/mock_apm_app_context';
import {
  expectTextsInDocument,
  expectTextsNotInDocument,
} from '../../../../utils/testHelpers';
import { CustomLinkToolbar } from './CustomLinkToolbar';

function Wrapper({ children }: { children?: ReactNode }) {
  return <MockApmAppContextProvider>{children}</MockApmAppContextProvider>;
}

describe('CustomLinkToolbar', () => {
  it('renders with create button', () => {
    const component = render(<CustomLinkToolbar onClickCreate={jest.fn()} />, {
      wrapper: Wrapper,
    });
    expect(
      component.getByLabelText('Custom links settings page')
    ).toBeInTheDocument();
    expectTextsInDocument(component, ['Create']);
  });

  it('renders without create button', () => {
    const component = render(
      <CustomLinkToolbar onClickCreate={jest.fn()} showCreateButton={false} />,
      { wrapper: Wrapper }
    );
    expect(
      component.getByLabelText('Custom links settings page')
    ).toBeInTheDocument();
    expectTextsNotInDocument(component, ['Create']);
  });

  it('opens flyout to create new custom link', () => {
    const handleCreateCustomLinkClickMock = jest.fn();
    const { getByText } = render(
      <CustomLinkToolbar onClickCreate={handleCreateCustomLinkClickMock} />,
      { wrapper: Wrapper }
    );
    expect(handleCreateCustomLinkClickMock).not.toHaveBeenCalled();
    act(() => {
      fireEvent.click(getByText('Create'));
    });
    expect(handleCreateCustomLinkClickMock).toHaveBeenCalled();
  });
});
