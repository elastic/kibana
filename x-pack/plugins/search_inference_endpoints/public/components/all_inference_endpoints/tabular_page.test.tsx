/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, screen } from '@testing-library/react';
import { render } from '@testing-library/react';
import { TabularPage } from './tabular_page';
import { InferenceAPIConfigResponse } from '@kbn/ml-trained-models-utils';

const setIsInferenceFlyoutVisibleMock = jest.fn();
const inferenceEndpoints = [
  {
    model_id: 'my-elser-model-04',
    task_type: 'sparse_embedding',
    service: 'elser',
    service_settings: {
      num_allocations: 1,
      num_threads: 1,
      model_id: '.elser_model_2',
    },
    task_settings: {},
  },
  {
    model_id: 'my-elser-model-05',
    task_type: 'sparse_embedding',
    service: 'elser',
    service_settings: {
      num_allocations: 1,
      num_threads: 1,
      model_id: '.elser_model_2',
    },
    task_settings: {},
  },
] as InferenceAPIConfigResponse[];

describe('When the tabular page is loaded', () => {
  beforeEach(() => {
    render(
      <TabularPage
        addEndpointLabel="Add endpoint"
        setIsInferenceFlyoutVisible={setIsInferenceFlyoutVisibleMock}
        inferenceEndpoints={inferenceEndpoints}
      />
    );
  });

  it('should display the description for creation of the first inference endpoint', () => {
    expect(
      screen.getByText(
        'Manage your Elastic and third-party endpoints generated from the Inference API.'
      )
    ).toBeInTheDocument();
  });

  it('calls setIsInferenceFlyoutVisible when the addInferenceEndpoint button is clicked', async () => {
    fireEvent.click(screen.getByTestId('addEndpointButtonForAllInferenceEndpoints'));
    expect(setIsInferenceFlyoutVisibleMock).toHaveBeenCalled();
  });
});
