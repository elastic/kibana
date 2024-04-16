/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render as testingLibraryRender, screen } from '@testing-library/react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';

import { SourcesPanelForStartChat } from './sources_panel_for_start_chat';
import { useSourceIndicesField } from '../../hooks/use_source_indices_field';
import { getDefaultSourceFields } from '../../utils/create_query';

const render = (children: React.ReactNode) =>
  testingLibraryRender(<IntlProvider locale="en">{children}</IntlProvider>);

jest.mock('./create_index_callout', () => ({ CreateIndexCallout: () => 'mocked component' }));
jest.mock('../../hooks/use_source_indices_field');
jest.mock('../../utils/create_query');
jest.mock('../../hooks/use_query_indices', () => {
  return {
    useQueryIndices: () => {
      return {
        indices: [],
        isLoading: false,
      };
    },
  };
});
jest.mock('../../hooks/use_indices_fields', () => {
  return {
    useIndicesFields: () => {
      return {
        fields: {},
        isLoading: false,
      };
    },
  };
});
jest.mock('react-hook-form', () => {
  return {
    useController: () => {
      return {
        field: { onChange: jest.fn() },
      };
    },
  };
});
const mockUseSourceIndicesField = useSourceIndicesField as jest.Mock;
const mockGetDefaultSourceFields = getDefaultSourceFields as jest.Mock;

describe('SourcesPanelForStartChat', () => {
  describe('renders sources', () => {
    beforeEach(() => {
      mockUseSourceIndicesField.mockReturnValue({
        selectedIndices: [],
        addIndex: jest.fn(),
        removeIndex: jest.fn(),
      });
      mockGetDefaultSourceFields.mockReturnValue({});
    });

    test('renders Sources', () => {
      render(<SourcesPanelForStartChat />);
      expect(screen.getByText(/Select Sources/i)).toBeInTheDocument();
    });
  });

  describe('with default index', () => {
    beforeEach(() => {
      mockUseSourceIndicesField.mockReturnValue({
        selectedIndices: ['index-1'],
        addIndex: jest.fn(),
        removeIndex: jest.fn(),
      });
      mockGetDefaultSourceFields.mockReturnValue({
        'index-1': ['text'],
      });
    });

    test('renders Sources', () => {
      render(<SourcesPanelForStartChat />);
      expect(screen.getByText(/Select Sources/i)).toBeInTheDocument();
    });
    test('renders indices table', () => {
      render(<SourcesPanelForStartChat />);
      expect(screen.getByText(/index-1/i)).toBeInTheDocument();
    });
  });

  describe('no source fields', () => {
    beforeEach(() => {
      mockGetDefaultSourceFields.mockReturnValue({
        'index-1': [undefined],
      });
    });
    test('renders warning callout', () => {
      render(<SourcesPanelForStartChat />);
      expect(screen.getByText(/No source fields found for index-1/i)).toBeInTheDocument();
    });
  });
});
