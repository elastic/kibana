/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { render } from '@testing-library/react';
import { GetStartedComponent } from './get_started';
import type { SecurityProductTypes } from '../../common/config';

jest.mock('./toggle_panel');
jest.mock('@elastic/eui', () => {
  const original = jest.requireActual('@elastic/eui');
  return {
    ...original,
    useEuiTheme: jest.fn().mockReturnValue({
      euiTheme: {
        base: 16,
        size: { xs: '4px' },
        colors: { darkShade: '' },
        font: { weight: { bold: 700 } },
      },
    }),
  };
});
jest.mock('../common/hooks/useUserName', () => ({
  useUserName: jest.fn().mockReturnValue('mockUser'),
}));

jest.mock('../common/services', () => ({
  useKibana: jest.fn().mockReturnValue({
    services: {
      cloud: {
        projectsUrl: 'https://cloud.elastic.co/projects',
        serverless: {
          projectId: 'test-project-id',
        },
      },
    },
  }),
}));

const productTypes = [
  { product_line: 'security', product_tier: 'essentials' },
  { product_line: 'endpoint', product_tier: 'complete' },
  { product_line: 'cloud', product_tier: 'complete' },
] as SecurityProductTypes;

describe('GetStartedComponent', () => {
  it('should render page title, subtitle, and description', () => {
    const { getByText } = render(<GetStartedComponent productTypes={productTypes} />);

    const pageTitle = getByText('Hi mockUser!');
    const subtitle = getByText(`Get started with Security`);
    const description = getByText(
      `This area shows you everything you need to know. Feel free to explore all content. You can always come back later at any time.`
    );

    expect(pageTitle).toBeInTheDocument();
    expect(subtitle).toBeInTheDocument();
    expect(description).toBeInTheDocument();
  });

  it('should render TogglePanel', () => {
    const { getByTestId } = render(<GetStartedComponent productTypes={productTypes} />);

    const togglePanel = getByTestId('toggle-panel');

    expect(togglePanel).toBeInTheDocument();
  });
});
