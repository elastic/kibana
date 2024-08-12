/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import {
  getMockServerDependencies,
  setupMockServer,
  startMockServer,
} from '../../test/mock_server/mock_server';
import { renderWrapper } from '../../test/mock_server/mock_server_test_provider';
import { Configurations } from './configurations';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from '@kbn/shared-ux-router';
import { findingsNavigation } from '../../common/navigation/constants';
import userEvent from '@testing-library/user-event';
import { FilterManager } from '@kbn/data-plugin/public';
import { CspClientPluginStartDeps } from '../../types';
import * as statusHandlers from '../../../server/routes/status/status.handlers.mock';
import {
  bsearchFindingsHandler,
  generateCspFinding,
  generateMultipleCspFindings,
  rulesGetStatesHandler,
} from './configurations.handlers.mock';

const server = setupMockServer();

const renderFindingsPage = (dependencies = getMockServerDependencies()) => {
  return renderWrapper(
    <MemoryRouter initialEntries={[findingsNavigation.findings_default.path]}>
      <Configurations />
    </MemoryRouter>,
    dependencies
  );
};

describe('<Findings />', () => {
  startMockServer(server);

  beforeEach(() => {
    server.use(rulesGetStatesHandler);
  });

  it('renders integrations installation prompt if integration is not installed', async () => {
    server.use(statusHandlers.notInstalledHandler);
    renderFindingsPage();

    expect(screen.getByText(/loading/i)).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText(/add cspm integration/i)).toBeInTheDocument());
    expect(screen.getByText(/add kspm integration/i)).toBeInTheDocument();
  });

  it("renders the 'latest findings' DataTable component when the CSPM/KSPM integration status is 'indexed' grouped by 'none'", async () => {
    const finding1 = generateCspFinding('0001', 'failed');
    const finding2 = generateCspFinding('0002', 'passed');

    server.use(statusHandlers.indexedHandler);
    server.use(bsearchFindingsHandler([finding1, finding2]));
    renderFindingsPage();

    // Loading while checking the status API
    expect(screen.getByText(/loading/i)).toBeInTheDocument();

    await waitFor(() => expect(screen.getByText(/2 findings/i)).toBeInTheDocument());

    expect(screen.getByText(finding1.resource.name)).toBeInTheDocument();
    expect(screen.getByText(finding1.resource.id)).toBeInTheDocument();
    expect(screen.getByText(finding1.rule.benchmark.rule_number as string)).toBeInTheDocument();
    expect(screen.getByText(finding1.rule.name)).toBeInTheDocument();
    expect(screen.getByText(finding1.rule.section)).toBeInTheDocument();

    expect(screen.getByText(finding2.resource.name)).toBeInTheDocument();
    expect(screen.getByText(finding2.resource.id)).toBeInTheDocument();
    expect(screen.getByText(finding2.rule.benchmark.rule_number as string)).toBeInTheDocument();
    expect(screen.getByText(finding2.rule.name)).toBeInTheDocument();
    expect(screen.getByText(finding2.rule.section)).toBeInTheDocument();

    expect(screen.getByText(/group findings by: none/i)).toBeInTheDocument();
  });

  describe('SearchBar', () => {
    it('set search query', async () => {
      const finding1 = generateCspFinding('0001', 'failed');
      const finding2 = generateCspFinding('0002', 'passed');

      server.use(statusHandlers.indexedHandler);
      server.use(bsearchFindingsHandler([finding1, finding2]));

      renderFindingsPage();

      // Loading while checking the status API
      expect(screen.getByText(/loading/i)).toBeInTheDocument();

      await waitFor(() => expect(screen.getByText(/2 findings/i)).toBeInTheDocument());

      const queryInput = screen.getByTestId('queryInput');
      userEvent.paste(queryInput, `rule.section : ${finding1.rule.section}`);

      const submitButton = screen.getByTestId('querySubmitButton');
      userEvent.click(submitButton);

      await waitFor(() => expect(screen.getByText(/1 findings/i)).toBeInTheDocument());

      expect(screen.getByText(finding1.resource.name)).toBeInTheDocument();
      expect(screen.queryByText(finding2.resource.id)).not.toBeInTheDocument();

      userEvent.clear(queryInput);
      userEvent.click(submitButton);
      await waitFor(() => expect(screen.getByText(/2 findings/i)).toBeInTheDocument());
    });
    it('renders no results message and reset button when search query does not match', async () => {
      const finding1 = generateCspFinding('0001', 'failed');
      const finding2 = generateCspFinding('0002', 'passed');

      server.use(statusHandlers.indexedHandler);
      server.use(bsearchFindingsHandler([finding1, finding2]));

      renderFindingsPage();

      // Loading while checking the status API
      expect(screen.getByText(/loading/i)).toBeInTheDocument();

      await waitFor(() => expect(screen.getByText(/2 findings/i)).toBeInTheDocument());

      const queryInput = screen.getByTestId('queryInput');
      userEvent.paste(queryInput, `rule.section : Invalid`);

      const submitButton = screen.getByTestId('querySubmitButton');
      userEvent.click(submitButton);

      await waitFor(() =>
        expect(screen.getByText(/no results match your search criteria/i)).toBeInTheDocument()
      );

      const resetButton = screen.getByRole('button', {
        name: /reset filters/i,
      });

      userEvent.click(resetButton);
      await waitFor(() => expect(screen.getByText(/2 findings/i)).toBeInTheDocument());
    });
    it('add filter', async () => {
      const finding1 = generateCspFinding('0001', 'failed');
      const finding2 = generateCspFinding('0002', 'passed');

      server.use(statusHandlers.indexedHandler);
      server.use(bsearchFindingsHandler([finding1, finding2]));

      renderFindingsPage();

      // Loading while checking the status API
      expect(screen.getByText(/loading/i)).toBeInTheDocument();

      await waitFor(() => expect(screen.getByText(/2 findings/i)).toBeInTheDocument());

      userEvent.click(screen.getByTestId('addFilter'), undefined, { skipPointerEventsCheck: true });

      await waitFor(() =>
        expect(screen.getByTestId('filterFieldSuggestionList')).toBeInTheDocument()
      );

      const filterFieldSuggestionListInput = within(
        screen.getByTestId('filterFieldSuggestionList')
      ).getByTestId('comboBoxSearchInput');

      userEvent.paste(filterFieldSuggestionListInput, 'rule.section');
      userEvent.keyboard('{enter}');

      const filterOperatorListInput = within(screen.getByTestId('filterOperatorList')).getByTestId(
        'comboBoxSearchInput'
      );
      userEvent.click(filterOperatorListInput, undefined, { skipPointerEventsCheck: true });

      const filterOption = within(
        screen.getByTestId('comboBoxOptionsList filterOperatorList-optionsList')
      ).getByRole('option', { name: 'is' });
      fireEvent.click(filterOption);

      const filterParamsInput = within(screen.getByTestId('filterParams')).getByRole('textbox');
      userEvent.paste(filterParamsInput, finding1.rule.section);

      userEvent.click(screen.getByTestId('saveFilter'), undefined, {
        skipPointerEventsCheck: true,
      });

      await waitFor(() => expect(screen.getByText(/1 findings/i)).toBeInTheDocument());
      expect(screen.getByText(finding1.resource.name)).toBeInTheDocument();
      expect(screen.queryByText(finding2.resource.id)).not.toBeInTheDocument();
    });
    it('remove filter', async () => {
      const finding1 = generateCspFinding('0001', 'failed');
      const finding2 = generateCspFinding('0002', 'passed');

      const mockedFilterManager = new FilterManager(getMockServerDependencies().core.uiSettings);
      mockedFilterManager.setFilters([
        {
          meta: {
            alias: `rule.section: ${finding1.rule.section}`,
            negate: false,
            disabled: false,
            key: 'rule.section',
            value: finding1.rule.section,
          },
          query: {
            match_phrase: {
              'rule.section': finding1.rule.section,
            },
          },
        },
      ]);
      const mockDependenciesWithFilter = {
        ...getMockServerDependencies(),
        deps: {
          ...getMockServerDependencies().deps,
          data: {
            ...getMockServerDependencies().deps.data,
            query: {
              ...getMockServerDependencies().deps.data!.query,
              filterManager: mockedFilterManager,
            },
          },
        } as unknown as Partial<CspClientPluginStartDeps>,
      };

      server.use(statusHandlers.indexedHandler);
      server.use(bsearchFindingsHandler([finding1, finding2]));

      renderFindingsPage(mockDependenciesWithFilter);

      // Loading while checking the status API
      expect(screen.getByText(/loading/i)).toBeInTheDocument();

      await waitFor(() => expect(screen.getByText(/1 findings/i)).toBeInTheDocument());
      expect(screen.getByText(finding1.resource.name)).toBeInTheDocument();
      expect(screen.queryByText(finding2.resource.id)).not.toBeInTheDocument();

      const deleteFilter = screen.getByRole('button', {
        name: `Delete rule.section: ${finding1.rule.section}`,
      });
      userEvent.click(deleteFilter);

      await waitFor(() => expect(screen.getByText(/2 findings/i)).toBeInTheDocument());

      expect(screen.getByText(finding1.resource.name)).toBeInTheDocument();
      expect(screen.getByText(finding2.resource.name)).toBeInTheDocument();
    });
  });

  describe('DistributionBar', () => {
    it('renders the distribution bar', async () => {
      server.use(statusHandlers.indexedHandler);
      server.use(
        bsearchFindingsHandler(
          generateMultipleCspFindings({
            count: 10,
            failedCount: 3,
          })
        )
      );

      renderFindingsPage();

      // Loading while checking the status API
      expect(screen.getByText(/loading/i)).toBeInTheDocument();

      await waitFor(() => expect(screen.getByText(/10 findings/i)).toBeInTheDocument());

      screen.getByRole('button', {
        name: /passed findings: 7/i,
      });
      screen.getByRole('button', {
        name: /failed findings: 3/i,
      });

      // Assert that the distribution bar has the correct percentages rendered
      expect(screen.getByTestId('distribution_bar_passed')).toHaveStyle('flex: 7');
      expect(screen.getByTestId('distribution_bar_failed')).toHaveStyle('flex: 3');
    });

    it('filters by passed findings when clicking on the passed findings button', async () => {
      server.use(statusHandlers.indexedHandler);
      server.use(
        bsearchFindingsHandler(
          generateMultipleCspFindings({
            count: 2,
            failedCount: 1,
          })
        )
      );

      renderFindingsPage();

      // Loading while checking the status API
      expect(screen.getByText(/loading/i)).toBeInTheDocument();

      await waitFor(() => expect(screen.getByText(/2 findings/i)).toBeInTheDocument());

      const passedFindingsButton = screen.getByRole('button', {
        name: /passed findings: 1/i,
      });
      userEvent.click(passedFindingsButton);

      await waitFor(() => expect(screen.getByText(/1 findings/i)).toBeInTheDocument());

      screen.getByRole('button', {
        name: /passed findings: 1/i,
      });
      screen.getByRole('button', {
        name: /failed findings: 0/i,
      });

      // Assert that the distribution bar has the correct percentages rendered
      expect(screen.getByTestId('distribution_bar_passed')).toHaveStyle('flex: 1');
      expect(screen.getByTestId('distribution_bar_failed')).toHaveStyle('flex: 0');
    }, 10000);
    it('filters by failed findings when clicking on the failed findings button', async () => {
      server.use(statusHandlers.indexedHandler);
      server.use(
        bsearchFindingsHandler(
          generateMultipleCspFindings({
            count: 2,
            failedCount: 1,
          })
        )
      );

      renderFindingsPage();

      // Loading while checking the status API
      expect(screen.getByText(/loading/i)).toBeInTheDocument();

      await waitFor(() => expect(screen.getByText(/2 findings/i)).toBeInTheDocument());

      const failedFindingsButton = screen.getByRole('button', {
        name: /failed findings: 1/i,
      });
      userEvent.click(failedFindingsButton);

      await waitFor(() => expect(screen.getByText(/1 findings/i)).toBeInTheDocument());

      screen.getByRole('button', {
        name: /passed findings: 0/i,
      });
      screen.getByRole('button', {
        name: /failed findings: 1/i,
      });

      // Assert that the distribution bar has the correct percentages rendered
      expect(screen.getByTestId('distribution_bar_passed')).toHaveStyle('flex: 0');
      expect(screen.getByTestId('distribution_bar_failed')).toHaveStyle('flex: 1');
    }, 10000);
  });
});
