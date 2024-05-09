/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render } from '@testing-library/react';
import { EmptyPromptComponent } from './empty_prompt';
import { SecurityPageName } from '../../../../common';
import { useNavigateTo } from '../../lib/kibana';
import { AddIntegrationsSteps } from '../landing_page/onboarding/types';

const mockNavigateTo = jest.fn();
const mockUseNavigateTo = useNavigateTo as jest.Mock;

jest.mock('../../lib/kibana', () => ({
  useNavigateTo: jest.fn(),
}));

describe('EmptyPromptComponent component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseNavigateTo.mockImplementation(() => ({ navigateTo: mockNavigateTo }));
  });

  it('has add data links', () => {
    const { getAllByText } = render(<EmptyPromptComponent />);
    expect(getAllByText('Add security integrations')).toHaveLength(2);
  });

  describe.each(['header', 'footer'])('URLs at the %s', (place) => {
    it('points to the default Add data URL', () => {
      const { getByTestId } = render(<EmptyPromptComponent />);
      const link = getByTestId(`add-integrations-${place}`);
      fireEvent.click(link);
      expect(mockNavigateTo).toBeCalledWith({
        deepLinkId: SecurityPageName.landing,
        path: `#${AddIntegrationsSteps.connectToDataSources}`,
      });
    });
  });
});
