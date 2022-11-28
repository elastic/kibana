/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import userEvent from '@testing-library/user-event';
import { FindingsRuleFlyout } from './findings_flyout';
import { render, screen } from '@testing-library/react';
import { TestProvider } from '../../../test/test_provider';
import { mockFindingsHit } from '../__mocks__/findings';

describe('<FindingsFlyout/>', () => {
  describe('Overview Tab', () => {
    it('details and remediation accordions are open', () => {
      const { getAllByRole } = render(
        <TestProvider>
          <FindingsRuleFlyout onClose={jest.fn} findings={mockFindingsHit} />
        </TestProvider>
      );

      getAllByRole('button', { expanded: true, name: 'Details' });
      getAllByRole('button', { expanded: true, name: 'Remediation' });
    });

    it('displays details', () => {
      const { getAllByText, getByText } = render(
        <TestProvider>
          <FindingsRuleFlyout onClose={jest.fn} findings={mockFindingsHit} />
        </TestProvider>
      );

      getAllByText(mockFindingsHit.rule.name);
      getAllByText(mockFindingsHit.rule.section);
      getByText(mockFindingsHit.resource.id);
      getByText(mockFindingsHit.resource.name);
    });
  });

  describe('Rule Tab', () => {
    it('displays rule benchmark name and section', () => {
      const { getByText, getAllByText } = render(
        <TestProvider>
          <FindingsRuleFlyout onClose={jest.fn} findings={mockFindingsHit} />
        </TestProvider>
      );

      userEvent.click(screen.getByTestId('findings_flyout_tab_rule'));

      getByText(mockFindingsHit.rule.benchmark.name);
      getAllByText(mockFindingsHit.rule.section);
    });
  });

  describe('Resource Tab', () => {
    it('displays resource name and id', () => {
      const { getAllByText } = render(
        <TestProvider>
          <FindingsRuleFlyout onClose={jest.fn} findings={mockFindingsHit} />
        </TestProvider>
      );

      userEvent.click(screen.getByTestId('findings_flyout_tab_resource'));

      getAllByText(mockFindingsHit.resource.name);
      getAllByText(mockFindingsHit.resource.id);
    });
  });

  describe('JSON Tab', () => {
    it('displays JSON', () => {
      render(
        <TestProvider>
          <FindingsRuleFlyout onClose={jest.fn} findings={mockFindingsHit} />
        </TestProvider>
      );

      userEvent.click(screen.getByTestId('findings_flyout_tab_json'));
    });
  });
});
