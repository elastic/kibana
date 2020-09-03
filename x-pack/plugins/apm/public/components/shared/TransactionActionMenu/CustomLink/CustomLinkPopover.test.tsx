/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { act, fireEvent, render } from '@testing-library/react';
import React, { ReactNode } from 'react';
import { CustomLink } from '../../../../../common/custom_link/custom_link_types';
import { Transaction } from '../../../../../typings/es_schemas/ui/transaction';
import { MockApmPluginContextWrapper } from '../../../../context/ApmPluginContext/MockApmPluginContext';
import { expectTextsInDocument } from '../../../../utils/testHelpers';
import { CustomLinkPopover } from './CustomLinkPopover';

function Wrapper({ children }: { children?: ReactNode }) {
  return <MockApmPluginContextWrapper>{children}</MockApmPluginContextWrapper>;
}

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
      />,
      { wrapper: Wrapper }
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
      />,
      { wrapper: Wrapper }
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
      />,
      { wrapper: Wrapper }
    );
    expect(handleCreateCustomLinkClickMock).not.toHaveBeenCalled();
    act(() => {
      fireEvent.click(getByText('Create'));
    });
    expect(handleCreateCustomLinkClickMock).toHaveBeenCalled();
  });
});
