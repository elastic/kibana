/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { render, act, fireEvent } from '@testing-library/react';
import { ManageCustomLink } from './ManageCustomLink';
import {
  expectTextsInDocument,
  expectTextsNotInDocument,
} from '../../../../utils/testHelpers';

describe('ManageCustomLink', () => {
  it('renders with create button', () => {
    const component = render(
      <ManageCustomLink onCreateCustomLinkClick={jest.fn()} />
    );
    expect(
      component.getByLabelText('Custom links settings page')
    ).toBeInTheDocument();
    expectTextsInDocument(component, ['Create']);
  });
  it('renders without create button', () => {
    const component = render(
      <ManageCustomLink
        onCreateCustomLinkClick={jest.fn()}
        showCreateCustomLinkButton={false}
      />
    );
    expect(
      component.getByLabelText('Custom links settings page')
    ).toBeInTheDocument();
    expectTextsNotInDocument(component, ['Create']);
  });
  it('opens flyout to create new custom link', () => {
    const handleCreateCustomLinkClickMock = jest.fn();
    const { getByText } = render(
      <ManageCustomLink
        onCreateCustomLinkClick={handleCreateCustomLinkClickMock}
      />
    );
    expect(handleCreateCustomLinkClickMock).not.toHaveBeenCalled();
    act(() => {
      fireEvent.click(getByText('Create'));
    });
    expect(handleCreateCustomLinkClickMock).toHaveBeenCalled();
  });
});
