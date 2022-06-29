/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, queryByAttribute } from '@testing-library/react';

import { EmptyPage, displayName } from './empty_page';

const queryByTestSubj = queryByAttribute.bind(null, 'data-test-subj');

describe('<EmptyPage />', () => {
  describe('default state', () => {
    it('should render', () => {
      const result = render(<EmptyPage integrationsPageLink="https://google.com" />);
      const integrationsPageLink = queryByTestSubj(
        result.container,
        `${displayName}-integrations-page-link`
      );

      expect(
        screen.queryByText('Get started with Elastic Threat intelligence')
      ).toBeInTheDocument();

      expect(integrationsPageLink).toBeInTheDocument();
      expect(integrationsPageLink).toHaveAttribute('href', 'https://google.com');
    });
  });
});
