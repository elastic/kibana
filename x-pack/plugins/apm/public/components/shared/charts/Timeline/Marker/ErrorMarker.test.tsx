/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { ErrorMarker } from './ErrorMarker';
import { ErrorMark } from '../../../../app/TransactionDetails/WaterfallWithSummmary/WaterfallContainer/Marks/get_error_marks';
import { render, fireEvent } from '@testing-library/react';
import { act } from '@testing-library/react-hooks';
import { expectTextsInDocument } from '../../../../../utils/testHelpers';

describe('ErrorMarker', () => {
  const mark = {
    id: 'agent',
    offset: 10000,
    type: 'errorMark',
    verticalLine: true,
    error: {
      trace: { id: '123' },
      transaction: { id: '456' },
      error: { grouping_key: '123' },
      service: { name: 'bar' },
    },
    serviceColor: '#fff',
  } as ErrorMark;

  function openPopover(errorMark: ErrorMark) {
    const component = render(<ErrorMarker mark={errorMark} />);
    act(() => {
      fireEvent.click(component.getByTestId('popover'));
    });
    expectTextsInDocument(component, ['10,000 μs']);
    return component;
  }
  function getKueryDecoded(url: string) {
    return decodeURIComponent(url.substring(url.indexOf('kuery='), url.length));
  }
  it('renders link with trace and transaction', () => {
    const component = openPopover(mark);
    const errorLink = component.getByTestId('errorLink') as HTMLAnchorElement;
    expect(getKueryDecoded(errorLink.hash)).toEqual(
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
    expect(getKueryDecoded(errorLink.hash)).toEqual('kuery=trace.id : "123"');
  });
  it('renders link with transaction', () => {
    const { trace, ...withoutTrace } = mark.error;
    const newMark = {
      ...mark,
      error: withoutTrace,
    } as ErrorMark;
    const component = openPopover(newMark);
    const errorLink = component.getByTestId('errorLink') as HTMLAnchorElement;
    expect(getKueryDecoded(errorLink.hash)).toEqual(
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
    expect(getKueryDecoded(errorLink.hash)).toEqual('kuery=');
  });
});
