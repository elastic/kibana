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
import { Draggable } from './draggable';
import type { ListOption } from './list_options';

describe('Draggable', () => {
  let appMockRender: AppMockRenderer;
  const listValues: ListOption[] = [{ id: '1', content: 'option 1' }];

  const props = {
    disabled: false,
    isLoading: false,
    onChange: jest.fn(),
    listValues,
    isEditingEnabled: false,
    handleEditingEnabled: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    appMockRender = createAppMockRenderer();
  });

  it('renders correctly', () => {
    appMockRender.render(<Draggable {...props} />);

    expect(screen.getByTestId('droppable')).toBeInTheDocument();
  });

  it('shows draggable correctly', async () => {
    appMockRender.render(<Draggable {...props} />);

    expect(screen.getByTestId('droppable')).toBeInTheDocument();
    expect(screen.getAllByTestId('draggable').length).toEqual(1);
  });

  it('shows multiple draggable correctly', async () => {
    appMockRender.render(
      <Draggable {...{ ...props, listValues: [...listValues, { id: '2', content: 'option 2' }] }} />
    );

    expect(screen.getByTestId('droppable')).toBeInTheDocument();
    expect(screen.getAllByTestId('draggable').length).toEqual(2);
  });

  it('does not show droppable field when no listValues', () => {
    appMockRender.render(<Draggable {...{ ...props, listValues: [] }} />);

    expect(screen.queryByTestId('droppable')).not.toBeInTheDocument();
  });
});
