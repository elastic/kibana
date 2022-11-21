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
import { CasesFlyout } from './flyout';

describe('CasesFlyout', () => {
  it('should render flyout with json details', () => {
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
    const closeFlyout = () => window.alert('closing');
    const component = render(
      <TestProvidersComponent>
        <CasesFlyout metadata={metadata} rawDocument={rawDocument} closeFlyout={closeFlyout} />
      </TestProvidersComponent>
    );
    expect(component).toMatchSnapshot();
  });
});
