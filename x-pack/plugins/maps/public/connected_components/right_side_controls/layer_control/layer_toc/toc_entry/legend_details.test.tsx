/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { LegendDetails } from './legend_details';
import type { ILayer } from '../../../../../classes/layers/layer';

describe('LegendDetails', () => {
  const mockLayer = {
    getErrors: () => {
      return [
        {
          title: 'simulated error',
          body: <div data-test-subj="layer-error"></div>
        }
      ];
    },
    getWarnings: () => {
      return [
        {
          title: 'simulated warning',
          body: <div data-test-subj="layer-warning"></div>
        }
      ];
    },
    renderLegendDetails: () => {
      return <div data-test-subj="layer-legend"></div>;
    },
  } as unknown as ILayer;

  test('Should only render errors when layer contains errors', () => {
    render(<LegendDetails layer={mockLayer} />);
    screen.getByTestId('layer-error');
    const error = screen.queryByTestId('layer-error');
    expect(error).not.toBeNull();
    const warning = screen.queryByTestId('layer-warning');
    expect(warning).toBeNull();
    const legend = screen.queryByTestId('layer-legend');
    expect(legend).toBeNull();
  });

  test('Should render warnings and legend when layer contains warnings', () => {
    render(<LegendDetails layer={{
      ...mockLayer,
      getErrors: () => {
        return [];
      },
    }} />);
    const error = screen.queryByTestId('layer-error');
    expect(error).toBeNull();
    const warning = screen.queryByTestId('layer-warning');
    expect(warning).not.toBeNull();
    const legend = screen.queryByTestId('layer-legend');
    expect(legend).not.toBeNull();
  });
});
