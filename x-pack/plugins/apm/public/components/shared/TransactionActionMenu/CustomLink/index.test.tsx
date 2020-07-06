/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { render, act, fireEvent } from '@testing-library/react';
import { CustomLink } from '.';
import { Transaction } from '../../../../../typings/es_schemas/ui/transaction';
import { FETCH_STATUS } from '../../../../hooks/useFetcher';
import {
  expectTextsInDocument,
  expectTextsNotInDocument,
} from '../../../../utils/testHelpers';
import { CustomLink as CustomLinkType } from '../../../../../common/custom_link/custom_link_types';

describe('Custom links', () => {
  it('shows empty message when no custom link is available', () => {
    const component = render(
      <CustomLink
        customLinks={[]}
        transaction={({} as unknown) as Transaction}
        onCreateCustomLinkClick={jest.fn()}
        onSeeMoreClick={jest.fn()}
        status={FETCH_STATUS.SUCCESS}
      />
    );

    expectTextsInDocument(component, [
      'No custom links found. Set up your own custom links, e.g., a link to a specific Dashboard or external link.',
    ]);
    expectTextsNotInDocument(component, ['Create']);
  });

  it('shows loading while custom links are fetched', () => {
    const { getByTestId } = render(
      <CustomLink
        customLinks={[]}
        transaction={({} as unknown) as Transaction}
        onCreateCustomLinkClick={jest.fn()}
        onSeeMoreClick={jest.fn()}
        status={FETCH_STATUS.LOADING}
      />
    );
    expect(getByTestId('loading-spinner')).toBeInTheDocument();
  });

  it('shows first 3 custom links available', () => {
    const customLinks = [
      { id: '1', label: 'foo', url: 'foo' },
      { id: '2', label: 'bar', url: 'bar' },
      { id: '3', label: 'baz', url: 'baz' },
      { id: '4', label: 'qux', url: 'qux' },
    ] as CustomLinkType[];
    const component = render(
      <CustomLink
        customLinks={customLinks}
        transaction={({} as unknown) as Transaction}
        onCreateCustomLinkClick={jest.fn()}
        onSeeMoreClick={jest.fn()}
        status={FETCH_STATUS.SUCCESS}
      />
    );
    expectTextsInDocument(component, ['foo', 'bar', 'baz']);
    expectTextsNotInDocument(component, ['qux']);
  });

  it('clicks on See more button', () => {
    const customLinks = [
      { id: '1', label: 'foo', url: 'foo' },
      { id: '2', label: 'bar', url: 'bar' },
      { id: '3', label: 'baz', url: 'baz' },
      { id: '4', label: 'qux', url: 'qux' },
    ] as CustomLinkType[];
    const onSeeMoreClickMock = jest.fn();
    const component = render(
      <CustomLink
        customLinks={customLinks}
        transaction={({} as unknown) as Transaction}
        onCreateCustomLinkClick={jest.fn()}
        onSeeMoreClick={onSeeMoreClickMock}
        status={FETCH_STATUS.SUCCESS}
      />
    );
    expect(onSeeMoreClickMock).not.toHaveBeenCalled();
    act(() => {
      fireEvent.click(component.getByText('See more'));
    });
    expect(onSeeMoreClickMock).toHaveBeenCalled();
  });

  describe('create custom link buttons', () => {
    it('shows create button below empty message', () => {
      const component = render(
        <CustomLink
          customLinks={[]}
          transaction={({} as unknown) as Transaction}
          onCreateCustomLinkClick={jest.fn()}
          onSeeMoreClick={jest.fn()}
          status={FETCH_STATUS.SUCCESS}
        />
      );

      expectTextsInDocument(component, ['Create custom link']);
      expectTextsNotInDocument(component, ['Create']);
    });
    it('shows create button besides the title', () => {
      const customLinks = [
        { id: '1', label: 'foo', url: 'foo' },
        { id: '2', label: 'bar', url: 'bar' },
        { id: '3', label: 'baz', url: 'baz' },
        { id: '4', label: 'qux', url: 'qux' },
      ] as CustomLinkType[];
      const component = render(
        <CustomLink
          customLinks={customLinks}
          transaction={({} as unknown) as Transaction}
          onCreateCustomLinkClick={jest.fn()}
          onSeeMoreClick={jest.fn()}
          status={FETCH_STATUS.SUCCESS}
        />
      );
      expectTextsInDocument(component, ['Create']);
      expectTextsNotInDocument(component, ['Create custom link']);
    });
  });
});
