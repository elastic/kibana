/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen } from '@testing-library/react';
import { EmptyStateComponent } from './empty_state';
import { StatesIndexStatus } from '../../../../common/runtime_types';
import { HttpFetchError, IHttpFetchError } from 'src/core/public';
import { render } from '../../../lib/helper/rtl_helpers';

describe('EmptyState component', () => {
  let statesIndexStatus: StatesIndexStatus;

  beforeEach(() => {
    statesIndexStatus = {
      indexExists: true,
      docCount: 1,
      indices: 'heartbeat-*,synthetics-*',
    };
  });

  it('renders child components when count is truthy', () => {
    render(
      <EmptyStateComponent statesIndexStatus={statesIndexStatus} loading={false}>
        <div>Foo</div>
        <div>Bar</div>
        <div>Baz</div>
      </EmptyStateComponent>
    );

    expect(screen.getByText('Foo')).toBeInTheDocument();
    expect(screen.getByText('Bar')).toBeInTheDocument();
    expect(screen.getByText('Baz')).toBeInTheDocument();
  });

  it(`doesn't render child components when count is falsy`, () => {
    render(
      <EmptyStateComponent statesIndexStatus={null} loading={false}>
        <div>Should not be rendered</div>
      </EmptyStateComponent>
    );
    expect(screen.queryByText('Should not be rendered')).toBeNull();
  });

  it(`renders error message when an error occurs`, () => {
    const errors: IHttpFetchError[] = [
      new HttpFetchError('There was an error fetching your data.', 'error', {} as any, {} as any, {
        body: { message: 'There was an error fetching your data.' },
      }),
    ];
    render(
      <EmptyStateComponent statesIndexStatus={null} errors={errors} loading={false}>
        <div>Should not appear...</div>
      </EmptyStateComponent>
    );
    expect(screen.queryByText('Should not appear...')).toBeNull();
  });

  it('renders loading state if no errors or doc count', () => {
    render(
      <EmptyStateComponent loading={true} statesIndexStatus={null}>
        <div>Should appear even while loading...</div>
      </EmptyStateComponent>
    );
    expect(screen.queryByText('Should appear even while loading...')).toBeInTheDocument();
  });

  it('does not render empty state with appropriate base path and no docs', () => {
    statesIndexStatus = {
      docCount: 0,
      indexExists: true,
      indices: 'heartbeat-*,synthetics-*',
    };
    const text = 'If this is in the snapshot the test should fail';
    render(
      <EmptyStateComponent statesIndexStatus={statesIndexStatus} loading={false}>
        <div>{text}</div>
      </EmptyStateComponent>
    );
    expect(screen.queryByText(text)).toBeNull();
  });

  it('notifies when index does not exist', () => {
    statesIndexStatus.indexExists = false;

    const text = 'This text should not render';

    render(
      <EmptyStateComponent statesIndexStatus={statesIndexStatus} loading={false}>
        <div>{text}</div>
      </EmptyStateComponent>
    );
    expect(screen.queryByText(text)).toBeNull();
  });
});
