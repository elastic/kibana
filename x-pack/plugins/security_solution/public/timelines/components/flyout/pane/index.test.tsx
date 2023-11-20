/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, waitFor } from '@testing-library/react';
import React from 'react';

import { TestProviders } from '../../../../common/mock';
import { TimelineId } from '../../../../../common/types/timeline';
import { Pane } from '.';

jest.mock('../../../../common/lib/kibana');
jest.mock('@kbn/i18n-react', () => {
  const originalModule = jest.requireActual('@kbn/i18n-react');
  const FormattedRelative = jest.fn().mockImplementation(() => '20 hours ago');

  return {
    ...originalModule,
    FormattedRelative,
  };
});

jest.mock('../../../../common/utils/normalize_time_range');

jest.mock('../../../../common/hooks/use_resolve_conflict', () => {
  return {
    useResolveConflict: jest.fn().mockImplementation(() => null),
  };
});

// FLAKY: https://github.com/elastic/kibana/issues/168026
describe.skip('Pane', () => {
  test('renders with display block by default', async () => {
    const EmptyComponent = render(
      <TestProviders>
        <Pane timelineId={TimelineId.test} />
      </TestProviders>
    );

    await waitFor(() => {
      expect(EmptyComponent.getByTestId('flyout-pane')).toHaveStyle('display: block');
    });
  });

  test.skip('renders with display none when visibility is set to false', async () => {
    const EmptyComponent = render(
      <TestProviders>
        <Pane timelineId={TimelineId.test} visible={false} />
      </TestProviders>
    );
    await waitFor(() => {
      expect(EmptyComponent.getByTestId('timeline-flyout')).toHaveStyle('display: none');
    });
  });
});
