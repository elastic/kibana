/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { registerTestBed } from '@kbn/test-jest-helpers';
import { act } from 'react-dom/test-utils';
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
  const setup = registerTestBed(TabularPage, {
    defaultProps: {
      addEndpointLabel: 'Add endpoint',
      setIsInferenceFlyoutVisible: setIsInferenceFlyoutVisibleMock,
      inferenceEndpoints,
    },
    memoryRouter: { wrapComponent: false },
  });
  const { exists, find } = setup();

  it('should display the description for creation of the first inference endpoint', () => {
    expect(find('allInferenceEndpointsPage').text()).toContain(
      'Manage your Elastic and third-party endpoints'
    );
  });

  it('calls setIsInferenceFlyoutVisible when the addInferenceEndpoint button is clicked', async () => {
    await act(async () => {
      find('addEndpointButtonForAllInferenceEndpoints').simulate('click');
    });
    expect(setIsInferenceFlyoutVisibleMock).toHaveBeenCalled();
  });
});
