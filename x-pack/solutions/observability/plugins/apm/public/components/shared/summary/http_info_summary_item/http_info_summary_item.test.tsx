/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen } from '@testing-library/react';
import { HttpInfoSummaryItem } from '.';
import * as exampleTransactions from '../__fixtures__/transactions';
import { renderWithTheme } from '../../../../utils/test_helpers';

describe('HttpInfoSummaryItem', () => {
  const transaction = exampleTransactions.httpOk;
  const url = 'https://example.com';
  const method = 'get';
  const baseProps = { transaction, url, method };
  const httpStatusCodeBadgeTestId = 'apmUiSharedHttpStatusCodeBadge';

  it('renders with base props', () => {
    renderWithTheme(<HttpInfoSummaryItem {...baseProps} status={100} />);
    expect(screen.getByTestId('apmHttpInfoUrl')).toBeInTheDocument();
  });

  it('does not render when url is empty', () => {
    const { container } = renderWithTheme(<HttpInfoSummaryItem url="" />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders status code 100', () => {
    renderWithTheme(<HttpInfoSummaryItem {...baseProps} status={100} />);
    const badge = screen.getByTestId(httpStatusCodeBadgeTestId);
    expect(badge).toHaveTextContent('100');
  });

  it('renders status code 200', () => {
    renderWithTheme(<HttpInfoSummaryItem {...baseProps} status={200} />);
    const badge = screen.getByTestId(httpStatusCodeBadgeTestId);
    expect(badge).toHaveTextContent('200');
  });

  it('renders status code 301', () => {
    renderWithTheme(<HttpInfoSummaryItem {...baseProps} status={301} />);
    const badge = screen.getByTestId(httpStatusCodeBadgeTestId);
    expect(badge).toHaveTextContent('301');
  });

  it('renders status code 404', () => {
    renderWithTheme(<HttpInfoSummaryItem {...baseProps} status={404} />);
    const badge = screen.getByTestId(httpStatusCodeBadgeTestId);
    expect(badge).toHaveTextContent('404');
  });

  it('renders status code 502', () => {
    renderWithTheme(<HttpInfoSummaryItem {...baseProps} status={502} />);
    const badge = screen.getByTestId(httpStatusCodeBadgeTestId);
    expect(badge).toHaveTextContent('502');
  });

  it('renders unknown status code', () => {
    renderWithTheme(<HttpInfoSummaryItem {...baseProps} status={700} />);
    const badge = screen.getByTestId(httpStatusCodeBadgeTestId);
    expect(badge).toHaveTextContent('700');
  });

  describe('fitToContainer', () => {
    it('renders the method, URL, and status', () => {
      renderWithTheme(<HttpInfoSummaryItem {...baseProps} status={502} fitToContainer />);

      expect(screen.getByTestId('apmHttpInfoRequestMethod')).toHaveTextContent('GET');
      expect(screen.getByTestId('apmHttpInfoUrl')).toHaveTextContent(url);
      expect(screen.getByTestId('apmHttpInfoRequestMethod').closest('.euiBadge')).toHaveTextContent(
        `GET ${url}`
      );
      expect(screen.getByTestId(httpStatusCodeBadgeTestId)).toHaveTextContent('502');
    });

    it('lets the URL shrink to the container instead of the fixed cap', () => {
      renderWithTheme(<HttpInfoSummaryItem {...baseProps} fitToContainer />);

      const urlAnchor = screen.getByTestId('apmHttpInfoUrl').parentElement;
      expect(urlAnchor).toHaveClass('apmHttpInfoUrlAnchor');
      expect(screen.getByTestId('apmHttpInfoUrl')).not.toHaveStyleRule('max-width', '384px');
    });

    it('keeps the fixed URL cap without fitToContainer', () => {
      renderWithTheme(<HttpInfoSummaryItem {...baseProps} />);

      expect(screen.getByTestId('apmHttpInfoUrl').parentElement).not.toHaveClass(
        'apmHttpInfoUrlAnchor'
      );
      expect(screen.getByTestId('apmHttpInfoUrl')).toHaveStyleRule('max-width', '384px');
    });
  });
});

// apmUiSharedHttpStatusCodeBadge
