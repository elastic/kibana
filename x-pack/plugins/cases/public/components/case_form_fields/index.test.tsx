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
import { CaseFormFields } from '.';
import { FormTestComponent } from '../../common/test_utils';
import { customFieldsConfigurationMock } from '../../containers/mock';
import { licensingMock } from '@kbn/licensing-plugin/public/mocks';

describe('CaseFormFields', () => {
  let appMock: AppMockRenderer;
  const onSubmit = jest.fn();
  const defaultProps = {
    configurationCustomFields: [],
    draftStorageKey: '',
  };

  beforeEach(() => {
    appMock = createAppMockRenderer();
    jest.clearAllMocks();
  });

  it('renders correctly', async () => {
    appMock.render(
      <FormTestComponent onSubmit={onSubmit}>
        <CaseFormFields {...defaultProps} />
      </FormTestComponent>
    );

    expect(await screen.findByTestId('case-form-fields')).toBeInTheDocument();
  });

  it('renders case fields correctly', async () => {
    appMock.render(
      <FormTestComponent onSubmit={onSubmit}>
        <CaseFormFields {...defaultProps} />
      </FormTestComponent>
    );

    expect(await screen.findByTestId('caseTitle')).toBeInTheDocument();
    expect(await screen.findByTestId('caseTags')).toBeInTheDocument();
    expect(await screen.findByTestId('caseCategory')).toBeInTheDocument();
    expect(await screen.findByTestId('caseSeverity')).toBeInTheDocument();
    expect(await screen.findByTestId('caseDescription')).toBeInTheDocument();
  });

  it('does not render customFields when empty', () => {
    appMock.render(
      <FormTestComponent onSubmit={onSubmit}>
        <CaseFormFields {...defaultProps} />
      </FormTestComponent>
    );

    expect(screen.queryByTestId('caseCustomFields')).not.toBeInTheDocument();
  });

  it('renders customFields when not empty', async () => {
    appMock.render(
      <FormTestComponent onSubmit={onSubmit}>
        <CaseFormFields
          configurationCustomFields={customFieldsConfigurationMock}
          draftStorageKey=""
        />
      </FormTestComponent>
    );

    expect(await screen.findByTestId('caseCustomFields')).toBeInTheDocument();
  });

  it('does not render assignees when no platinum license', () => {
    appMock.render(
      <FormTestComponent onSubmit={onSubmit}>
        <CaseFormFields {...defaultProps} />
      </FormTestComponent>
    );

    expect(screen.queryByTestId('createCaseAssigneesComboBox')).not.toBeInTheDocument();
  });

  it('renders assignees when platinum license', async () => {
    const license = licensingMock.createLicense({
      license: { type: 'platinum' },
    });

    appMock = createAppMockRenderer({ license });

    appMock.render(
      <FormTestComponent onSubmit={onSubmit}>
        <CaseFormFields {...defaultProps} />
      </FormTestComponent>
    );

    expect(await screen.findByTestId('createCaseAssigneesComboBox')).toBeInTheDocument();
  });
});
