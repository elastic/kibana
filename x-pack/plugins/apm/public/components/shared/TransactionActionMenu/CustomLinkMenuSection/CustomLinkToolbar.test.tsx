/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { act, fireEvent, render } from '@testing-library/react';
import React, { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { MockApmPluginContextWrapper } from '../../../../context/ApmPluginContext/MockApmPluginContext';
import {
  expectTextsInDocument,
  expectTextsNotInDocument,
} from '../../../../utils/testHelpers';
import { CustomLinkToolbar } from './CustomLinkToolbar';

function Wrapper({ children }: { children?: ReactNode }) {
  return (
    <MemoryRouter>
      <MockApmPluginContextWrapper>{children}</MockApmPluginContextWrapper>
    </MemoryRouter>
  );
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
