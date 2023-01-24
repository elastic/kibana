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
import { LATEST_FINDINGS_INDEX_DEFAULT_NS } from '../../../../common/constants';

const TestComponent = () => (
  <TestProvider>
    <FindingsRuleFlyout onClose={jest.fn} findings={mockFindingsHit} />
  </TestProvider>
);

describe('<FindingsFlyout/>', () => {
  describe('Overview Tab', () => {
    it('details and remediation accordions are open', () => {
      const { getAllByRole } = render(<TestComponent />);

      getAllByRole('button', { expanded: true, name: 'Details' });
      getAllByRole('button', { expanded: true, name: 'Remediation' });
    });

    it('displays text details summary info', () => {
      const { getAllByText, getByText } = render(<TestComponent />);

      getAllByText(mockFindingsHit.rule.name);
      getByText(mockFindingsHit.resource.id);
      getByText(mockFindingsHit.resource.name);
      getAllByText(mockFindingsHit.rule.section);
      getByText(LATEST_FINDINGS_INDEX_DEFAULT_NS);
      mockFindingsHit.rule.tags.forEach((tag) => {
        getAllByText(tag);
      });
    });
  });

  describe('Rule Tab', () => {
    it('displays rule text details', () => {
      const { getByText, getAllByText } = render(<TestComponent />);

      userEvent.click(screen.getByTestId('findings_flyout_tab_rule'));

      getAllByText(mockFindingsHit.rule.name);
      getByText(mockFindingsHit.rule.benchmark.name);
      getAllByText(mockFindingsHit.rule.section);
      mockFindingsHit.rule.tags.forEach((tag) => {
        getAllByText(tag);
      });
    });
  });

  describe('Resource Tab', () => {
    it('displays resource name and id', () => {
      const { getAllByText } = render(<TestComponent />);

      userEvent.click(screen.getByTestId('findings_flyout_tab_resource'));

      getAllByText(mockFindingsHit.resource.name);
      getAllByText(mockFindingsHit.resource.id);
    });
  });
});
