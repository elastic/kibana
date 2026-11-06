/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { css } from '@emotion/react';
import { ServiceMapLegend } from './service_map_legend';
import { MOCK_EUI_THEME_FOR_USE_THEME } from './constants';

const MOCK_DOCS_LINK = 'https://www.elastic.co/docs/apm/service-maps#service-maps-legend';

jest.mock('@elastic/eui', () => {
  const original = jest.requireActual('@elastic/eui');
  return {
    ...original,
    useEuiTheme: () => ({ euiTheme: MOCK_EUI_THEME_FOR_USE_THEME }),
  };
});

jest.mock('../../../context/apm_plugin/use_apm_plugin_context', () => ({
  useApmPluginContext: () => ({
    core: {
      docLinks: {
        links: {
          apm: {
            supportedServiceMaps: MOCK_DOCS_LINK,
            supportedServiceMapsLegend: MOCK_DOCS_LINK,
          },
        },
      },
    },
  }),
}));

const controlIconCss = css`
  min-inline-size: 32px;
  min-block-size: 32px;
`;

describe('ServiceMapLegend', () => {
  it('renders the legend button without errors', () => {
    render(<ServiceMapLegend controlIconCss={controlIconCss} />);

    const button = screen.getByTestId('serviceMapLegendButton');
    expect(button).toBeInTheDocument();
    expect(button).toHaveAttribute('aria-label', 'Legend');
  });

  it('opens the popover when the button is clicked', async () => {
    render(<ServiceMapLegend controlIconCss={controlIconCss} />);

    expect(screen.queryByText('Node shapes')).not.toBeInTheDocument();

    await act(async () => {
      fireEvent.click(screen.getByTestId('serviceMapLegendButton'));
    });

    expect(screen.getByText('Node shapes')).toBeInTheDocument();
    expect(screen.getByText('Connections')).toBeInTheDocument();
    expect(screen.getByText('Anomaly score')).toBeInTheDocument();
  });

  it('renders the docs link pointing to the service maps documentation', async () => {
    render(<ServiceMapLegend controlIconCss={controlIconCss} />);

    await act(async () => {
      fireEvent.click(screen.getByTestId('serviceMapLegendButton'));
    });

    const docsLink = screen.getByTestId('serviceMapLegendDocsLink');
    expect(docsLink).toBeInTheDocument();
    expect(docsLink).toHaveAttribute('href', MOCK_DOCS_LINK);
  });
});
