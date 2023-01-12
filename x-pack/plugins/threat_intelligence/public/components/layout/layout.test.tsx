/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen } from '@testing-library/react';
import React from 'react';
import { DefaultPageLayout } from './layout';
import '@testing-library/jest-dom';
import { TestProvidersComponent } from '../../common/mocks/test_providers';
import { TITLE_TEST_ID } from './test_ids';

describe('<Layout />', () => {
  describe('when pageTitle is not specified', () => {
    beforeEach(() => {
      render(<DefaultPageLayout />, { wrapper: TestProvidersComponent });
    });

    it('should not render secondary heading', () => {
      expect(screen.queryByTestId(`${TITLE_TEST_ID}`)).not.toBeInTheDocument();
    });
  });

  describe('when pageTitle is passed, it should be rendered as secondary heading', () => {
    beforeEach(() => {
      render(<DefaultPageLayout pageTitle="Stranger Threats" />, {
        wrapper: TestProvidersComponent,
      });
    });

    it('should render secondary heading', () => {
      expect(screen.queryByText('Stranger Threats')).toBeInTheDocument();
    });
  });
});
