/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fireEvent } from '@testing-library/react';
import { act } from '@testing-library/react-hooks';
import React, { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { MockApmPluginContextWrapper } from '../../../../../context/apm_plugin/mock_apm_plugin_context';
import {
  expectTextsInDocument,
  renderWithTheme,
} from '../../../../../utils/testHelpers';
import { ErrorMark } from '../../../../app/TransactionDetails/WaterfallWithSummmary/WaterfallContainer/Marks/get_error_marks';
import { ErrorMarker } from './ErrorMarker';

function Wrapper({ children }: { children?: ReactNode }) {
  return (
    <MemoryRouter>
      <MockApmPluginContextWrapper>{children}</MockApmPluginContextWrapper>
    </MemoryRouter>
  );
}

describe('ErrorMarker', () => {
  const mark = ({
    id: 'agent',
    offset: 10000,
    type: 'errorMark',
    verticalLine: true,
    error: {
      trace: { id: '123' },
      transaction: { id: '456' },
      error: {
        grouping_key: '123',
        log: {
          message:
            "Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled it to make a type specimen book. It has survived not only five centuries, but also the leap into electronic typesetting, remaining essentially unchanged. It was popularised in the 1960s with the release of Letraset sheets containing Lorem Ipsum passages, and more recently with desktop publishing software like Aldus PageMaker including versions of Lorem Ipsum.",
        },
      },
      service: { name: 'bar' },
    },
    serviceColor: '#fff',
  } as unknown) as ErrorMark;

  function openPopover(errorMark: ErrorMark) {
    const component = renderWithTheme(<ErrorMarker mark={errorMark} />, {
      wrapper: Wrapper,
    });
    act(() => {
      fireEvent.click(component.getByTestId('popover'));
    });
    expectTextsInDocument(component, ['10 ms']);
    return component;
  }
  function getKueryDecoded(url: string) {
    return decodeURIComponent(
      url.substring(url.indexOf('kuery='), url.indexOf('&'))
    );
  }
  it('renders link with trace and transaction', () => {
    const component = openPopover(mark);
    const errorLink = component.getByTestId('errorLink') as HTMLAnchorElement;

    expect(getKueryDecoded(errorLink.search)).toEqual(
      'kuery=trace.id : "123" and transaction.id : "456"'
    );
  });
  it('renders link with trace', () => {
    const { transaction, ...withoutTransaction } = mark.error;
    const newMark = {
      ...mark,
      error: withoutTransaction,
    } as ErrorMark;
    const component = openPopover(newMark);
    const errorLink = component.getByTestId('errorLink') as HTMLAnchorElement;
    expect(getKueryDecoded(errorLink.search)).toEqual('kuery=trace.id : "123"');
  });
  it('renders link with transaction', () => {
    const { trace, ...withoutTrace } = mark.error;
    const newMark = {
      ...mark,
      error: withoutTrace,
    } as ErrorMark;
    const component = openPopover(newMark);
    const errorLink = component.getByTestId('errorLink') as HTMLAnchorElement;
    expect(getKueryDecoded(errorLink.search)).toEqual(
      'kuery=transaction.id : "456"'
    );
  });
  it('renders link without trance and transaction', () => {
    const { trace, transaction, ...withoutTraceAndTransaction } = mark.error;
    const newMark = {
      ...mark,
      error: withoutTraceAndTransaction,
    } as ErrorMark;
    const component = openPopover(newMark);
    const errorLink = component.getByTestId('errorLink') as HTMLAnchorElement;
    expect(getKueryDecoded(errorLink.search)).toEqual('kuery=');
  });
  it('truncates the error message text', () => {
    const { trace, transaction, ...withoutTraceAndTransaction } = mark.error;
    const newMark = {
      ...mark,
      error: withoutTraceAndTransaction,
    } as ErrorMark;
    const component = openPopover(newMark);
    const errorLink = component.getByTestId('errorLink') as HTMLAnchorElement;
    expect(errorLink.innerHTML).toHaveLength(241);
  });

  describe('when the error message is not longer than 240 characters', () => {
    it('truncates the error message text', () => {
      const newMark = ({
        ...mark,
        error: {
          ...mark.error,
          error: {
            grouping_key: '123',
            log: {
              message: 'Blah.',
            },
          },
        },
      } as unknown) as ErrorMark;
      const component = openPopover(newMark);
      const errorLink = component.getByTestId('errorLink') as HTMLAnchorElement;
      expect(errorLink.innerHTML).toHaveLength(5);
    });
  });
});
