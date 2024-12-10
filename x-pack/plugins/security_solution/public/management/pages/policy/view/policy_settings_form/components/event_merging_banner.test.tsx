/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RenderResult } from '@testing-library/react';
import React from 'react';
import { createAppRootMockRenderer } from '../../../../../../common/mock/endpoint';
import { EventMergingBanner, type EventMergingBannerProps } from './event_merging_banner';

describe('EventMergingBanner component', () => {
  let formProps: EventMergingBannerProps;
  let renderResult: RenderResult;

  beforeEach(() => {
    const mockedContext = createAppRootMockRenderer();

    formProps = {
      onDismiss: jest.fn(),
    };

    renderResult = mockedContext.render(<EventMergingBanner {...formProps} />);
  });

  it('should render event merging banner', () => {
    expect(renderResult.getByTestId('eventMergingCallout')).toBeInTheDocument();
  });

  it('should contain a link to documentation', () => {
    const docLink = renderResult.getByTestId('eventMergingDocLink');

    expect(docLink).toBeInTheDocument();
    expect(docLink.getAttribute('href')).toContain('endpoint-data-volume.html');
  });

  it('should call `onDismiss` callback when user clicks dismiss', () => {
    renderResult.getByTestId('euiDismissCalloutButton').click();

    expect(formProps.onDismiss).toBeCalled();
  });
});
