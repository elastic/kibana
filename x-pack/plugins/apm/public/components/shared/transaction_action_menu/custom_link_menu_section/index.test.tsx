/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, fireEvent, render } from '@testing-library/react';
import React, { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { CustomLinkMenuSection } from '.';
import { Transaction } from '../../../../../typings/es_schemas/ui/transaction';
import { MockApmPluginContextWrapper } from '../../../../context/apm_plugin/mock_apm_plugin_context';
import * as useFetcher from '../../../../hooks/use_fetcher';
import {
  expectTextsInDocument,
  expectTextsNotInDocument,
} from '../../../../utils/test_helpers';

function Wrapper({ children }: { children?: ReactNode }) {
  return (
    <MemoryRouter>
      <MockApmPluginContextWrapper>{children}</MockApmPluginContextWrapper>
    </MemoryRouter>
  );
}

const transaction = {
  service: {
    name: 'name',
    environment: 'env',
  },
  transaction: {
    name: 'tx name',
    type: 'tx type',
  },
} as unknown as Transaction;

describe('Custom links', () => {
  it('shows empty message when no custom link is available', () => {
    jest.spyOn(useFetcher, 'useFetcher').mockReturnValue({
      data: { customLinks: [] },
      status: useFetcher.FETCH_STATUS.SUCCESS,
      refetch: jest.fn(),
    });

    const component = render(
      <CustomLinkMenuSection transaction={transaction} />,
      { wrapper: Wrapper }
    );

    expectTextsInDocument(component, [
      'No custom links found. Set up your own custom links, e.g., a link to a specific Dashboard or external link.',
    ]);
    expectTextsNotInDocument(component, ['Create']);
  });

  it('shows loading while custom links are fetched', () => {
    jest.spyOn(useFetcher, 'useFetcher').mockReturnValue({
      data: { customLinks: [] },
      status: useFetcher.FETCH_STATUS.LOADING,
      refetch: jest.fn(),
    });

    const { getByTestId } = render(
      <CustomLinkMenuSection transaction={transaction} />,
      { wrapper: Wrapper }
    );
    expect(getByTestId('loading-spinner')).toBeInTheDocument();
  });

  it('shows first 3 custom links available', () => {
    const customLinks = {
      customLinks: [
        { id: '1', label: 'foo', url: 'foo' },
        { id: '2', label: 'bar', url: 'bar' },
        { id: '3', label: 'baz', url: 'baz' },
        { id: '4', label: 'qux', url: 'qux' },
      ],
    };

    jest.spyOn(useFetcher, 'useFetcher').mockReturnValue({
      data: customLinks,
      status: useFetcher.FETCH_STATUS.SUCCESS,
      refetch: jest.fn(),
    });

    const component = render(
      <CustomLinkMenuSection transaction={transaction} />,
      { wrapper: Wrapper }
    );
    expectTextsInDocument(component, ['foo', 'bar', 'baz']);
    expectTextsNotInDocument(component, ['qux']);
  });

  it('clicks "show all" and "show fewer"', () => {
    const data = {
      customLinks: [
        { id: '1', label: 'foo', url: 'foo' },
        { id: '2', label: 'bar', url: 'bar' },
        { id: '3', label: 'baz', url: 'baz' },
        { id: '4', label: 'qux', url: 'qux' },
      ],
    };

    jest.spyOn(useFetcher, 'useFetcher').mockReturnValue({
      data,
      status: useFetcher.FETCH_STATUS.SUCCESS,
      refetch: jest.fn(),
    });

    const component = render(
      <CustomLinkMenuSection transaction={transaction} />,
      { wrapper: Wrapper }
    );

    expect(component.getAllByRole('listitem').length).toEqual(3);
    act(() => {
      fireEvent.click(component.getByText('Show all'));
    });
    expect(component.getAllByRole('listitem').length).toEqual(4);
    act(() => {
      fireEvent.click(component.getByText('Show fewer'));
    });
    expect(component.getAllByRole('listitem').length).toEqual(3);
  });

  describe('create custom link buttons', () => {
    it('shows create button below empty message', () => {
      jest.spyOn(useFetcher, 'useFetcher').mockReturnValue({
        data: { customLinks: [] },
        status: useFetcher.FETCH_STATUS.SUCCESS,
        refetch: jest.fn(),
      });

      const component = render(
        <CustomLinkMenuSection transaction={transaction} />,
        { wrapper: Wrapper }
      );

      expectTextsInDocument(component, ['Create custom link']);
      expectTextsNotInDocument(component, ['Create']);
    });

    it('shows create button besides the title', () => {
      const data = {
        customLinks: [
          { id: '1', label: 'foo', url: 'foo' },
          { id: '2', label: 'bar', url: 'bar' },
          { id: '3', label: 'baz', url: 'baz' },
          { id: '4', label: 'qux', url: 'qux' },
        ],
      };

      jest.spyOn(useFetcher, 'useFetcher').mockReturnValue({
        data,
        status: useFetcher.FETCH_STATUS.SUCCESS,
        refetch: jest.fn(),
      });

      const component = render(
        <CustomLinkMenuSection transaction={transaction} />,
        { wrapper: Wrapper }
      );
      expectTextsInDocument(component, ['Create']);
      expectTextsNotInDocument(component, ['Create custom link']);
    });
  });
});
