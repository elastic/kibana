/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { AttachmentMetadata } from '../../../utils';
import { TestProvidersComponent } from '../../../../../common/mocks/test_providers';
import { CasesFlyoutJson } from './json';

describe('CasesFlyoutJsonProps', () => {
  it('should render json', () => {
    const metadata: AttachmentMetadata = {
      indicatorName: 'abc',
      indicatorType: 'file',
      indicatorFeedName: 'feed',
      indicatorFirstSeen: '2022-01-01T01:01:01.000Z',
    };
    const rawDocument: Record<string, unknown> = {
      prop1: 'prop1',
      prop2: 'prop2',
    };
    const component = render(
      <TestProvidersComponent>
        <CasesFlyoutJson metadata={metadata} rawDocument={rawDocument} />
      </TestProvidersComponent>
    );
    expect(component).toMatchSnapshot();
  });

  it('should render error if input is null', () => {
    const metadata: AttachmentMetadata = {
      indicatorName: 'abc',
      indicatorType: 'file',
      indicatorFeedName: 'feed',
      indicatorFirstSeen: '2022-01-01T01:01:01.000Z',
    };
    const rawDocument: Record<string, unknown> = null as unknown as Record<string, unknown>;
    const component = render(
      <TestProvidersComponent>
        <CasesFlyoutJson metadata={metadata} rawDocument={rawDocument} />
      </TestProvidersComponent>
    );
    expect(component).toMatchSnapshot();
  });
});
