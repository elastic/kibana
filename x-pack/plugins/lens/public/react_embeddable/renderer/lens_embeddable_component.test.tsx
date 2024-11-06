/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen } from '@testing-library/react';
import { getLensApiMock, getLensInternalApiMock } from '../mocks';
import { LensApi, LensInternalApi } from '../types';
import { BehaviorSubject } from 'rxjs';
import { PublishingSubject } from '@kbn/presentation-publishing';
import React from 'react';
import { LensEmbeddableComponent } from './lens_embeddable_component';

type GetValueType<Type> = Type extends PublishingSubject<infer X> ? X : never;

function getDefaultProps({
  internalApiOverrides = undefined,
  apiOverrides = undefined,
}: { internalApiOverrides?: Partial<LensInternalApi>; apiOverrides?: Partial<LensApi> } = {}) {
  return {
    internalApi: getLensInternalApiMock(internalApiOverrides),
    api: getLensApiMock(apiOverrides),
    onUnmount: jest.fn(),
  };
}

describe('Lens Embeddable component', () => {
  it('should not render the visualization if any error arises', () => {
    const props = getDefaultProps({
      internalApiOverrides: {
        expressionParams$: new BehaviorSubject<GetValueType<LensInternalApi['expressionParams$']>>(
          null
        ),
      },
    });

    render(<LensEmbeddableComponent {...props} />);
    expect(screen.queryByTestId('lens-embeddable')).not.toBeInTheDocument();
  });
});
