/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';

import { TestProviders, mockIndexNames, mockIndexPattern } from '../../../../common/mock';
import { useSourcererDataView } from '../../../../common/containers/sourcerer';
import { allCasesPermissions, readCasesPermissions } from '../../../../cases_test_utils';
import { mockBrowserFields } from '../../../../common/containers/source/mock';
import { TimelineActionMenu } from '.';
import { TimelineId, TimelineTabs } from '../../../../../common/types';
import { useKibana as mockUseKibana } from '../../../../common/lib/kibana/__mocks__';

const mockUseSourcererDataView: jest.Mock = useSourcererDataView as jest.Mock;
const mockedUseKibana = mockUseKibana();
const mockCanUseCases = jest.fn();

jest.mock('../../../../common/containers/sourcerer');

jest.mock('../../../../common/lib/kibana/kibana_react', () => {
  const original = jest.requireActual('../../../../common/lib/kibana/kibana_react');

  return {
    ...original,
    useKibana: () => ({
      ...mockedUseKibana,
      services: {
        ...mockedUseKibana.services,
        cases: {
          ...mockedUseKibana.services.cases,
          helpers: { canUseCases: mockCanUseCases },
        },
      },
      application: {
        capabilities: {
          navLinks: {},
          management: {},
          catalogue: {},
          actions: { show: true, crud: true },
        },
      },
    }),
  };
});

jest.mock('@kbn/i18n-react', () => {
  const originalModule = jest.requireActual('@kbn/i18n-react');
  const FormattedRelative = jest.fn().mockImplementation(() => '20 hours ago');

  return {
    ...originalModule,
    FormattedRelative,
  };
});

const sourcererDefaultValue = {
  sourcererDefaultValue: mockBrowserFields,
  indexPattern: mockIndexPattern,
  loading: false,
  selectedPatterns: mockIndexNames,
};

describe('Action menu', () => {
  beforeEach(() => {
    // Mocking these services is required for the header component to render.
    mockUseSourcererDataView.mockImplementation(() => sourcererDefaultValue);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('AddToCaseButton', () => {
    it('renders the button when the user has create and read permissions', () => {
      mockCanUseCases.mockReturnValue(allCasesPermissions());

      render(
        <TestProviders>
          <TimelineActionMenu
            timelineId={TimelineId.test}
            activeTab={TimelineTabs.query}
            isInspectButtonDisabled={false}
          />
        </TestProviders>
      );

      expect(
        screen.getByTestId('timeline-modal-attach-to-case-dropdown-button')
      ).toBeInTheDocument();
    });

    it('does not render the button when the user does not have create permissions', () => {
      mockCanUseCases.mockReturnValue(readCasesPermissions());

      render(
        <TestProviders>
          <TimelineActionMenu
            timelineId={TimelineId.test}
            activeTab={TimelineTabs.query}
            isInspectButtonDisabled={false}
          />
        </TestProviders>
      );

      expect(
        screen.queryByTestId('timeline-modal-attach-to-case-dropdown-button')
      ).not.toBeInTheDocument();
    });
  });
});
