/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { render, act, fireEvent } from '@testing-library/react';
import { Transaction } from '../../../../../typings/es_schemas/ui/transaction';
import { CustomLinkPopover } from './CustomLinkPopover';
import { expectTextsInDocument } from '../../../../utils/testHelpers';
import { CustomLink } from '../../../../../common/custom_link/custom_link_types';

describe('CustomLinkPopover', () => {
  const customLinks = [
    { id: '1', label: 'foo', url: 'http://elastic.co' },
    {
      id: '2',
      label: 'bar',
      url: 'http://elastic.co?service.name={{service.name}}',
    },
  ] as CustomLink[];
  const transaction = ({
    service: { name: 'foo.bar' },
  } as unknown) as Transaction;
  it('renders popover', () => {
    const component = render(
      <CustomLinkPopover
        customLinks={customLinks}
        transaction={transaction}
        onCreateCustomLinkClick={jest.fn()}
        onClose={jest.fn()}
      />
    );
    expectTextsInDocument(component, ['CUSTOM LINKS', 'Create', 'foo', 'bar']);
  });

  it('closes popover', () => {
    const handleCloseMock = jest.fn();
    const { getByText } = render(
      <CustomLinkPopover
        customLinks={customLinks}
        transaction={transaction}
        onCreateCustomLinkClick={jest.fn()}
        onClose={handleCloseMock}
      />
    );
    expect(handleCloseMock).not.toHaveBeenCalled();
    act(() => {
      fireEvent.click(getByText('CUSTOM LINKS'));
    });
    expect(handleCloseMock).toHaveBeenCalled();
  });

  it('opens flyout to create new custom link', () => {
    const handleCreateCustomLinkClickMock = jest.fn();
    const { getByText } = render(
      <CustomLinkPopover
        customLinks={customLinks}
        transaction={transaction}
        onCreateCustomLinkClick={handleCreateCustomLinkClickMock}
        onClose={jest.fn()}
      />
    );
    expect(handleCreateCustomLinkClickMock).not.toHaveBeenCalled();
    act(() => {
      fireEvent.click(getByText('Create'));
    });
    expect(handleCreateCustomLinkClickMock).toHaveBeenCalled();
  });
});
