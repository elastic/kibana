/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { registerTestBed } from '@kbn/test-jest-helpers';
import { act } from 'react-dom/test-utils';
import { AddEmptyPrompt } from './add_empty_prompt';

const setIsInferenceFlyoutVisibleMock = jest.fn();

describe('When empty prompt is loaded', () => {
  const setup = registerTestBed(AddEmptyPrompt, {
    defaultProps: {
      addEndpointLabel: 'Add endpoint',
      setIsInferenceFlyoutVisible: setIsInferenceFlyoutVisibleMock,
    },
    memoryRouter: { wrapComponent: false },
  });
  const { exists, find } = setup();

  it('should display the description for creation of the first inference endpoint', () => {
    expect(find('createFirstInferenceEndpointDescription').text()).toContain(
      'Connect to your third-party model provider of choice to setup a single entity for semantic search.'
    );
  });

  it('calls setIsInferenceFlyoutVisible when the addInferenceEndpoint button is clicked', async () => {
    await act(async () => {
      find('addEndpointButtonForEmptyPrompt').simulate('click');
    });
    expect(setIsInferenceFlyoutVisibleMock).toHaveBeenCalled();
  });

  it('should display the elser prompt for empty state', () => {
    expect(find('elserPromptForEmptyState').text()).toContain(
      "ELSER is Elastic's NLP model for English semantic search"
    );
  });

  it('should display the e5 multilingual prompt for empty state', () => {
    expect(find('multilingualE5PromptForEmptyState').text()).toContain(
      'E5 is a third party NLP model that enables'
    );
  });
});
