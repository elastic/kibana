/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { type RenderResult } from '@testing-library/react';

import { createFleetTestRendererMock } from '../../../../../../../mock';

import {
  BidirectionalIntegrationsBanner,
  type BidirectionalIntegrationsBannerProps,
} from './bidirectional_integrations_callout';

jest.mock('react-use/lib/useLocalStorage');

describe('BidirectionalIntegrationsBanner', () => {
  let formProps: BidirectionalIntegrationsBannerProps;
  let renderResult: RenderResult;

  beforeEach(() => {
    formProps = {
      onDismiss: jest.fn(),
    };

    const renderer = createFleetTestRendererMock();

    renderResult = renderer.render(<BidirectionalIntegrationsBanner {...formProps} />);
  });

  it('should render bidirectional integrations banner', () => {
    expect(renderResult.getByTestId('bidirectionalIntegrationsCallout')).toBeInTheDocument();
  });

  it('should contain a link to documentation', () => {
    const docLink = renderResult.getByTestId('bidirectionalIntegrationDocLink');

    expect(docLink).toBeInTheDocument();
    expect(docLink.getAttribute('href')).toContain('third-party-actions.html');
  });

  it('should call `onDismiss` callback when user clicks dismiss', () => {
    renderResult.getByTestId('euiDismissCalloutButton').click();

    expect(formProps.onDismiss).toBeCalled();
  });
});
