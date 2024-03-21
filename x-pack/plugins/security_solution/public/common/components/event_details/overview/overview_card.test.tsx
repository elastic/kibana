/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, render } from '@testing-library/react';
import { OverviewCardWithActions } from './overview_card';
import { createMockStore, mockGlobalState, TestProviders } from '../../../mock';
import { SeverityBadge } from '../../severity_badge';
import type { State } from '../../../store';
import { TimelineId } from '../../../../../common/types';
import { createAction } from '@kbn/ui-actions-plugin/public';

const state: State = {
  ...mockGlobalState,
  timeline: {
    ...mockGlobalState.timeline,
    timelineById: {
      [TimelineId.casePage]: {
        ...mockGlobalState.timeline.timelineById[TimelineId.test],
        id: TimelineId.casePage,
      },
    },
  },
};

const store = createMockStore(state);

const props = {
  title: 'Severity',
  contextId: 'timeline-case',
  enrichedFieldInfo: {
    contextId: 'timeline-case',
    eventId: 'testid',
    fieldType: 'string',
    data: {
      field: 'kibana.alert.rule.severity',
      format: 'string',
      type: 'string',
      isObjectArray: false,
    },
    values: ['medium'],
    fieldFromBrowserField: {
      category: 'kibana',
      count: 0,
      name: 'kibana.alert.rule.severity',
      type: 'string',
      esTypes: ['keyword'],
      scripted: false,
      searchable: true,
      aggregatable: true,
      readFromDocValues: true,
      format: 'string',
      shortDotsEnable: false,
      isMapped: true,
      indexes: ['apm-*-transaction*'],
      description: '',
      example: '',
      fields: {},
    },
    scopeId: 'timeline-case',
  },
};

jest.mock('../../../lib/kibana');

jest.mock('../../../hooks/use_get_field_spec');

const mockAction = createAction({
  id: 'test_action',
  execute: async () => {},
  getIconType: () => 'test-icon',
  getDisplayName: () => 'test-actions',
});

describe('OverviewCardWithActions', () => {
  test('it renders correctly', async () => {
    await act(async () => {
      const { getByText, findByTestId } = render(
        <TestProviders store={store} cellActions={[mockAction]}>
          <OverviewCardWithActions {...props}>
            <SeverityBadge value="medium" />
          </OverviewCardWithActions>
        </TestProviders>
      );
      // Headline
      getByText('Severity');

      // Content
      getByText('Medium');

      // Hover actions
      await findByTestId('actionItem-test_action');
    });
  });
});
