/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen } from '@testing-library/react';
import type { AppMockRenderer } from '../../common/mock';
import { createAppMockRenderer } from '../../common/mock';
import { FormFields } from './form_fields';
import { FormTestComponent } from '../../common/test_utils';
import { connectorsMock, customFieldsConfigurationMock } from '../../containers/mock';
import { ConnectorTypes } from '../../../common/types/domain';
import { TEMPLATE_FIELDS, CASE_FIELDS, CONNECTOR_FIELDS } from './translations';

describe('form fields', () => {
  let appMockRenderer: AppMockRenderer;
  const onSubmit = jest.fn();
  const defaultProps = {
    connectors: connectorsMock,
    configurationConnector: {
      id: 'none',
      type: ConnectorTypes.none,
      fields: null,
      name: 'My Connector',
    },
    configurationCustomFields: [],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    appMockRenderer = createAppMockRenderer();
  });

  it('renders correctly', async () => {
    appMockRenderer.render(
      <FormTestComponent onSubmit={onSubmit}>
        <FormFields {...defaultProps} />
      </FormTestComponent>
    );

    expect(await screen.findByTestId('template-creation-form-steps')).toBeInTheDocument();
  });

  it('renders all steps', async () => {
    appMockRenderer.render(
      <FormTestComponent onSubmit={onSubmit}>
        <FormFields {...defaultProps} />
      </FormTestComponent>
    );

    expect(await screen.findByText(TEMPLATE_FIELDS)).toBeInTheDocument();
    expect(await screen.findByText(CASE_FIELDS)).toBeInTheDocument();
    expect(await screen.findByText(CONNECTOR_FIELDS)).toBeInTheDocument();
  });

  it('renders template fields correctly', async () => {
    appMockRenderer.render(
      <FormTestComponent onSubmit={onSubmit}>
        <FormFields {...defaultProps} />
      </FormTestComponent>
    );

    expect(await screen.findByTestId('template-name-input')).toBeInTheDocument();
    expect(await screen.findByTestId('template-description-input')).toBeInTheDocument();
  });

  it('renders case fields', async () => {
    appMockRenderer.render(
      <FormTestComponent onSubmit={onSubmit}>
        <FormFields {...defaultProps} />
      </FormTestComponent>
    );

    expect(await screen.findByTestId('case-form-fields')).toBeInTheDocument();
    expect(await screen.findByTestId('caseTitle')).toBeInTheDocument();
    expect(await screen.findByTestId('caseTags')).toBeInTheDocument();
    expect(await screen.findByTestId('caseCategory')).toBeInTheDocument();
    expect(await screen.findByTestId('caseSeverity')).toBeInTheDocument();
    expect(await screen.findByTestId('caseDescription')).toBeInTheDocument();
  });

  it('renders custom fields correctly', async () => {
    const newProps = {
      ...defaultProps,
      configurationCustomFields: customFieldsConfigurationMock,
    };
    appMockRenderer.render(
      <FormTestComponent onSubmit={onSubmit}>
        <FormFields {...newProps} />
      </FormTestComponent>
    );

    expect(await screen.findByTestId('caseCustomFields')).toBeInTheDocument();
  });

  it('renders default connector correctly', async () => {
    appMockRenderer.render(
      <FormTestComponent onSubmit={onSubmit}>
        <FormFields {...defaultProps} />
      </FormTestComponent>
    );

    expect(await screen.findByTestId('caseConnectors')).toBeInTheDocument();
  });

  it('renders connector and its fields correctly', async () => {
    const newProps = {
      ...defaultProps,
      configurationConnector: {
        id: 'servicenow-1',
        name: 'my_service_now_connector',
        type: ConnectorTypes.serviceNowITSM,
        fields: null,
      },
    };

    appMockRenderer.render(
      <FormTestComponent onSubmit={onSubmit}>
        <FormFields {...newProps} />
      </FormTestComponent>
    );

    expect(await screen.findByTestId('caseConnectors')).toBeInTheDocument();
    expect(await screen.findByTestId('connector-fields')).toBeInTheDocument();
    expect(await screen.findByTestId('connector-fields-sn-itsm')).toBeInTheDocument();
  });
});
