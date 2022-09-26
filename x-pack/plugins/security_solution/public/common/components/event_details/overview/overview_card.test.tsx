/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { OverviewCardWithActions } from './overview_card';
import {
  createSecuritySolutionStorageMock,
  kibanaObservable,
  mockGlobalState,
  SUB_PLUGINS_REDUCER,
  TestProviders,
} from '../../../mock';
import { SeverityBadge } from '../../../../detections/components/rules/severity_badge';
import type { State } from '../../../store';
import { createStore } from '../../../store';
import { TimelineId } from '../../../../../common/types';
import { tGridReducer } from '@kbn/timelines-plugin/public';

const state: State = {
  ...mockGlobalState,
  timeline: {
    ...mockGlobalState.timeline,
    timelineById: {
      [TimelineId.casePage]: {
        ...mockGlobalState.timeline.timelineById['timeline-test'],
        id: TimelineId.casePage,
        dataProviders: [
          {
            id: 'draggable-badge-default-draggable-netflow-renderer-timeline-1-_qpBe3EBD7k-aQQL7v7--_qpBe3EBD7k-aQQL7v7--network_transport-tcp',
            name: 'tcp',
            enabled: true,
            excluded: false,
            kqlQuery: '',
            queryMatch: {
              field: 'network.transport',
              value: 'tcp',
              operator: ':',
            },
            and: [],
          },
        ],
        eventType: 'all',
        filters: [
          {
            meta: {
              alias: null,
              disabled: false,
              key: 'source.port',
              negate: false,
              params: {
                query: '30045',
              },
              type: 'phrase',
            },
            query: {
              match_phrase: {
                'source.port': {
                  query: '30045',
                },
              },
            },
          },
        ],
        kqlMode: 'filter',
        kqlQuery: {
          filterQuery: {
            kuery: {
              kind: 'kuery',
              expression: 'host.name : *',
            },
            serializedQuery:
              '{"bool":{"should":[{"exists":{"field":"host.name"}}],"minimum_should_match":1}}',
          },
        },
      },
    },
  },
};

const { storage } = createSecuritySolutionStorageMock();
const store = createStore(
  state,
  SUB_PLUGINS_REDUCER,
  { dataTable: tGridReducer },
  kibanaObservable,
  storage
);

const props = {
  title: 'Severity',
  contextId: 'timeline-case',
  enrichedFieldInfo: {
    contextId: 'timeline-case',
    eventId: 'testid',
    fieldType: 'string',
    // scopeId: 'timeline-case',
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

describe('OverviewCardWithActions', () => {
  test('it renders correctly', () => {
    const { getByText } = render(
      <TestProviders store={store}>
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
    getByText('Add To Timeline');
  });
});
