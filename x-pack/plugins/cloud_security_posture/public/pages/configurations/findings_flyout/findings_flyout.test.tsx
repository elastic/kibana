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
import { CDR_MISCONFIGURATIONS_INDEX_PATTERN } from '../../../../common/constants';
import { mockFindingsHit, mockWizFinding } from '../__mocks__/findings';

const onPaginate = jest.fn();

const TestComponent = ({ ...overrideProps }) => (
  <TestProvider>
    <FindingsRuleFlyout
      onClose={jest.fn}
      flyoutIndex={0}
      findingsCount={2}
      onPaginate={onPaginate}
      finding={mockFindingsHit}
      {...overrideProps}
    />
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
      getByText(CDR_MISCONFIGURATIONS_INDEX_PATTERN);
      mockFindingsHit.rule.tags.forEach((tag) => {
        getAllByText(tag);
      });
    });

    it('displays missing info callout when data source is not CSP', () => {
      const { getByText } = render(<TestComponent finding={mockWizFinding} />);
      getByText('Some fields not provided by Wiz');
    });

    it('does not display missing info callout when data source is CSP', () => {
      const { queryByText } = render(<TestComponent finding={mockFindingsHit} />);
      const missingInfoCallout = queryByText('Some fields not provided by Wiz');
      expect(missingInfoCallout).toBeNull();
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

    it('displays missing info callout when data source is not CSP', () => {
      const { getByText } = render(<TestComponent finding={mockWizFinding} />);
      userEvent.click(screen.getByTestId('findings_flyout_tab_rule'));

      getByText('Some fields not provided by Wiz');
    });

    it('does not display missing info callout when data source is CSP', () => {
      const { queryByText } = render(<TestComponent finding={mockFindingsHit} />);
      userEvent.click(screen.getByTestId('findings_flyout_tab_rule'));

      const missingInfoCallout = queryByText('Some fields not provided by Wiz');
      expect(missingInfoCallout).toBeNull();
    });
  });

  describe('Table Tab', () => {
    it('displays resource name and id', () => {
      const { getAllByText } = render(<TestComponent />);
      userEvent.click(screen.getByTestId('findings_flyout_tab_table'));

      getAllByText(mockFindingsHit.resource.name);
      getAllByText(mockFindingsHit.resource.id);
    });

    it('does not display missing info callout for 3Ps', () => {
      const { queryByText } = render(<TestComponent finding={mockWizFinding} />);
      userEvent.click(screen.getByTestId('findings_flyout_tab_table'));

      const missingInfoCallout = queryByText('Some fields not provided by Wiz');
      expect(missingInfoCallout).toBeNull();
    });
  });

  describe('JSON Tab', () => {
    it('does not display missing info callout for 3Ps', () => {
      const { queryByText } = render(<TestComponent finding={mockWizFinding} />);
      userEvent.click(screen.getByTestId('findings_flyout_tab_json'));

      const missingInfoCallout = queryByText('Some fields not provided by Wiz');
      expect(missingInfoCallout).toBeNull();
    });
  });

  it('should allow pagination with next', async () => {
    const { getByTestId } = render(<TestComponent />);

    userEvent.click(getByTestId('pagination-button-next'));

    expect(onPaginate).toHaveBeenCalledWith(1);
  });

  it('should allow pagination with previous', async () => {
    const { getByTestId } = render(<TestComponent flyoutIndex={1} />);

    userEvent.click(getByTestId('pagination-button-previous'));

    expect(onPaginate).toHaveBeenCalledWith(0);
  });
});
