/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render } from '@testing-library/react';
import React from 'react';

import { TestProviders } from '../../../../common/mock';
import { TimelineId } from '../../../../../common/types/timeline';
import { Pane } from '.';

jest.mock('../../../../common/lib/kibana');
jest.mock('../../../../common/components/url_state/normalize_time_range.ts');

jest.mock('../../../../common/hooks/use_resolve_conflict', () => {
  return {
    useResolveConflict: jest.fn().mockImplementation(() => null),
  };
});

describe('Pane', () => {
  test('renders with display block by default', () => {
    const EmptyComponent = render(
      <TestProviders>
        <Pane timelineId={TimelineId.test} />
      </TestProviders>
    );
    expect(EmptyComponent.getByTestId('flyout-pane')).toHaveStyle('display: block');
  });

  test('renders with display none when visibility is set to false', () => {
    const EmptyComponent = render(
      <TestProviders>
        <Pane timelineId={TimelineId.test} visible={false} />
      </TestProviders>
    );
    expect(EmptyComponent.getByTestId('flyout-pane')).toHaveStyle('display: none');
  });
});
