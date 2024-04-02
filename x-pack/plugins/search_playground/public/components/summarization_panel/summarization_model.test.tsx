/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render as testingLibraryRender } from '@testing-library/react';
import { SummarizationModel } from './summarization_model';
import { useManagementLink } from '../../hooks/use_management_link';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';

const render = (children: React.ReactNode) =>
  testingLibraryRender(<IntlProvider locale="en">{children}</IntlProvider>);
const MockIcon = () => <span />;

jest.mock('../../hooks/use_management_link');

const mockUseManagementLink = useManagementLink as jest.Mock;

describe('SummarizationModel', () => {
  beforeEach(() => {
    mockUseManagementLink.mockReturnValue('http://example.com/manage-connectors');
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('renders correctly with models', () => {
    const models = [
      { name: 'Model1', disabled: false, icon: MockIcon, connectorId: 'connector1' },
      { name: 'Model2', disabled: true, icon: MockIcon, connectorId: 'connector2' },
    ];
    const { getByTestId } = render(
      <SummarizationModel selectedModel="Model1" models={models} onSelect={jest.fn()} />
    );

    expect(getByTestId('summarizationModelSelect')).toBeInTheDocument();
    expect(getByTestId('manageConnectorsLink')).toHaveAttribute(
      'href',
      'http://example.com/manage-connectors'
    );
  });
});
