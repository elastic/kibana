/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, fireEvent, screen } from '@testing-library/react';
import React from 'react';

import { PipelineItem } from './pipeline_item';
import { InferenceUsageInfo } from '../../../../types';
import { useKibana } from '../../../../../../hooks/use_kibana';

jest.mock('../../../../../../hooks/use_kibana');
const mockUseKibana = useKibana as jest.Mock;
const mockNavigateToApp = jest.fn();

describe('Pipeline item', () => {
  const item: InferenceUsageInfo = {
    id: 'pipeline-1',
    type: 'Pipeline',
  };
  beforeEach(() => {
    mockUseKibana.mockReturnValue({
      services: {
        application: {
          navigateToApp: mockNavigateToApp,
        },
      },
    });
    render(<PipelineItem usageItem={item} />);
  });

  describe('pipeline', () => {
    it('renders', () => {
      expect(screen.getByText('pipeline-1')).toBeInTheDocument();
      expect(screen.getByText('Pipeline')).toBeInTheDocument();
    });

    it('opens pipeline in a new tab', () => {
      fireEvent.click(screen.getByRole('button'));
      expect(mockNavigateToApp).toHaveBeenCalledWith('management', {
        path: 'ingest/ingest_pipelines?pipeline=pipeline-1',
        openInNewTab: true,
      });
    });
  });
});
