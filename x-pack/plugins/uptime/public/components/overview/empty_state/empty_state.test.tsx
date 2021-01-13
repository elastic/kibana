/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EmptyStateComponent } from './empty_state';
import { StatesIndexStatus } from '../../../../common/runtime_types';
import { HttpFetchError, IHttpFetchError } from 'src/core/public';
import { mountWithRouter, shallowWithRouter } from '../../../lib';

describe('EmptyState component', () => {
  let statesIndexStatus: StatesIndexStatus;

  beforeEach(() => {
    statesIndexStatus = {
      indexExists: true,
      docCount: 1,
    };
  });

  it('renders child components when count is truthy', () => {
    const component = shallowWithRouter(
      <EmptyStateComponent statesIndexStatus={statesIndexStatus} loading={false}>
        <div>Foo</div>
        <div>Bar</div>
        <div>Baz</div>
      </EmptyStateComponent>
    );
    expect(component).toMatchSnapshot();
  });

  it(`doesn't render child components when count is falsy`, () => {
    const component = mountWithRouter(
      <EmptyStateComponent statesIndexStatus={null} loading={false}>
        <div>Shouldn&apos;t be rendered</div>
      </EmptyStateComponent>
    );
    expect(component).toMatchSnapshot();
  });

  it(`renders error message when an error occurs`, () => {
    const errors: IHttpFetchError[] = [
      new HttpFetchError('There was an error fetching your data.', 'error', {} as any, {} as any, {
        body: { message: 'There was an error fetching your data.' },
      }),
    ];
    const component = mountWithRouter(
      <EmptyStateComponent statesIndexStatus={null} errors={errors} loading={false}>
        <div>Shouldn&apos;t appear...</div>
      </EmptyStateComponent>
    );
    expect(component).toMatchSnapshot();
  });

  it('renders loading state if no errors or doc count', () => {
    const component = mountWithRouter(
      <EmptyStateComponent loading={true} statesIndexStatus={null}>
        <div>Should appear even while loading...</div>
      </EmptyStateComponent>
    );
    expect(component).toMatchSnapshot();
  });

  it('does not render empty state with appropriate base path and no docs', () => {
    statesIndexStatus = {
      docCount: 0,
      indexExists: true,
    };
    const component = mountWithRouter(
      <EmptyStateComponent statesIndexStatus={statesIndexStatus} loading={false}>
        <div>If this is in the snapshot the test should fail</div>
      </EmptyStateComponent>
    );
    expect(component).toMatchSnapshot();
  });

  it('notifies when index does not exist', () => {
    statesIndexStatus.indexExists = false;
    const component = mountWithRouter(
      <EmptyStateComponent statesIndexStatus={statesIndexStatus} loading={false}>
        <div>This text should not render</div>
      </EmptyStateComponent>
    );
    expect(component).toMatchSnapshot();
  });
});
