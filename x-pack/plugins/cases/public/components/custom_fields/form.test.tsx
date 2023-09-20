/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen, fireEvent } from '@testing-library/react';

import type { AppMockRenderer } from '../../common/mock';
import { createAppMockRenderer } from '../../common/mock';
import { CustomFieldsForm } from './form';
import { CustomFieldTypes } from '../../../common/types/domain';
import * as i18n from './translations';

describe('CustomFieldsForm ', () => {
  let appMockRender: AppMockRenderer;
  const onChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    appMockRender = createAppMockRenderer();
  });

  it('renders correctly', async () => {
    appMockRender.render(<CustomFieldsForm onChange={onChange} />);

    expect(screen.getByTestId('custom-field-label-input')).toBeInTheDocument();
    expect(screen.getByTestId('custom-field-type-selector')).toBeInTheDocument();
  });

  it('renders text as default custom field type', async () => {
    appMockRender.render(<CustomFieldsForm onChange={onChange} />);

    expect(screen.getByTestId('custom-field-type-selector')).toBeInTheDocument();
    expect(screen.getByText('Text')).toBeInTheDocument();

    expect(screen.getByText(i18n.FIELD_OPTION_REQUIRED)).toBeInTheDocument();
  });

  it('renders custom field type options', async () => {
    appMockRender.render(<CustomFieldsForm onChange={onChange} />);

    expect(screen.getByText('Text')).toBeInTheDocument();
    expect(screen.getByText('Toggle')).toBeInTheDocument();
  });

  it('renders toggle custom field type', async () => {
    appMockRender.render(<CustomFieldsForm onChange={onChange} />);

    fireEvent.change(screen.getByTestId('custom-field-type-selector'), {
      target: { value: CustomFieldTypes.TOGGLE },
    });

    expect(screen.getByTestId('toggle-custom-field-options')).toBeInTheDocument();
    expect(screen.getByText(i18n.FIELD_OPTION_REQUIRED)).toBeInTheDocument();
  });
});
