/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { TransactionDetailLink } from './transaction_detail_link';
import { createMemoryHistory } from 'history';
import React from 'react';
import { Router } from 'react-router-dom';
import { MockApmPluginContextWrapper } from '../../../../context/apm_plugin/mock_apm_plugin_context';
import { render } from '@testing-library/react';

const history = createMemoryHistory();

function Wrapper({ children }: { children: React.ReactElement }) {
  return (
    <MockApmPluginContextWrapper>
      <Router history={history}>{children}</Router>
    </MockApmPluginContextWrapper>
  );
}

describe('TransactionDetailLink', () => {
  function getHref(container: HTMLElement) {
    return ((container as HTMLDivElement).children[0] as HTMLAnchorElement)
      .href;
  }
  describe('With comparison in the url', () => {
    it('returns comparison defined in the url', () => {
      const { container } = render(
        <Wrapper>
          <TransactionDetailLink
            serviceName="foo"
            transactionName="bar"
            transactionType="request"
            comparisonEnabled
            offset="1w"
            traceId="baz"
            transactionId="123"
          >
            Transaction
          </TransactionDetailLink>
        </Wrapper>
      );
      expect(getHref(container)).toEqual(
        'http://localhost/basepath/app/apm/services/foo/transactions/view?traceId=baz&transactionId=123&transactionName=bar&transactionType=request&comparisonEnabled=true&offset=1w'
      );
    });
  });

  describe('use default comparison', () => {
    it('returns default comparison', () => {
      const { container } = render(
        <Wrapper>
          <TransactionDetailLink
            serviceName="foo"
            transactionName="bar"
            transactionType="request"
            traceId="baz"
            transactionId="123"
          >
            Transaction
          </TransactionDetailLink>
        </Wrapper>
      );
      expect(getHref(container)).toEqual(
        'http://localhost/basepath/app/apm/services/foo/transactions/view?traceId=baz&transactionId=123&transactionName=bar&transactionType=request&comparisonEnabled=true&offset=1d'
      );
    });
  });
});
