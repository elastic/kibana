/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen } from '@testing-library/react';

import type { AppMockRenderer } from '../../../common/mock';
import { createAppMockRenderer } from '../../../common/mock';
import type { CustomFieldsConfiguration } from '../../../../common/types/domain';
import { CustomFieldTypes } from '../../../../common/types/domain';
import { CustomFieldsList } from '.';

describe('CustomFieldsList', () => {
  let appMockRender: AppMockRenderer;
  const customFieldsMock: CustomFieldsConfiguration = [
    {
      key: 'random_custom_key',
      label: 'Summary',
      type: CustomFieldTypes.TEXT,
      required: true,
    },
    {
      key: 'random_custom_key_2',
      label: 'Maintenance',
      type: CustomFieldTypes.TOGGLE,
      required: false,
    },
  ];

  const props = {
    customFields: customFieldsMock,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    appMockRender = createAppMockRenderer();
  });

  it('renders correctly', () => {
    appMockRender.render(<CustomFieldsList {...props} />);

    expect(screen.getByTestId('droppable')).toBeInTheDocument();
  });

  it('shows CustomFieldsList correctly', async () => {
    appMockRender.render(<CustomFieldsList {...props} />);

    expect(screen.getByTestId('droppable')).toBeInTheDocument();
    expect(screen.getAllByTestId('draggable').length).toEqual(2);
  });

  it('shows single CustomFieldsList correctly', async () => {
    appMockRender.render(<CustomFieldsList customFields={[customFieldsMock[0]]} />);

    expect(screen.getByTestId('droppable')).toBeInTheDocument();
    expect(screen.getAllByTestId('draggable').length).toEqual(1);
  });

  it('does not show droppable field when no custom fields', () => {
    appMockRender.render(<CustomFieldsList customFields={[]} />);

    expect(screen.queryByTestId('droppable')).not.toBeInTheDocument();
  });
});
