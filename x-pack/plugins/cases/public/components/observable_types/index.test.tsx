/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen } from '@testing-library/react';

import type { AppMockRenderer } from '../../common/mock';
import { createAppMockRenderer, noCasesPermissions } from '../../common/mock';
import type { ObservableTypesProps } from '.';
import { ObservableTypes } from '.';
import { observableTypesMock } from '../../containers/mock';

describe('ObservableTypes', () => {
  let appMock: AppMockRenderer;

  const props: ObservableTypesProps = {
    disabled: false,
    isLoading: false,
    observableTypes: [],
    handleAddObservableType: jest.fn(),
    handleEditObservableType: jest.fn(),
    handleDeleteObservableType: jest.fn(),
  };

  describe('with sufficient permissions', () => {
    beforeEach(() => {
      appMock = createAppMockRenderer();
      jest.clearAllMocks();
    });

    it('renders correctly when there are no observable types', async () => {
      appMock.render(<ObservableTypes {...props} />);
      expect(await screen.findByTestId('observable-types-form-group')).toBeInTheDocument();
      expect(screen.queryByTestId('observable-types-list')).not.toBeInTheDocument();
    });

    it('renders correctly when there are observable types', async () => {
      appMock.render(<ObservableTypes {...{ ...props, observableTypes: observableTypesMock }} />);
      expect(await screen.findByTestId('observable-types-form-group')).toBeInTheDocument();
      expect(await screen.findByTestId('observable-types-list')).toBeInTheDocument();
    });
  });

  describe('with insufficient permissions', () => {
    beforeEach(() => {
      appMock = createAppMockRenderer({ permissions: noCasesPermissions() });
      jest.clearAllMocks();
    });

    it('renders correctly when there are no observable types', async () => {
      appMock.render(<ObservableTypes {...props} />);
      expect(screen.queryByTestId('observable-types-form-group')).not.toBeInTheDocument();
    });
  });
});
