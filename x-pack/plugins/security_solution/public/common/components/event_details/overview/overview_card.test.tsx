/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { OverviewCardWithActions } from './overview_card';
import { TestProviders } from '../../../../common/mock';
import { SeverityBadge } from '../../../../../public/detections/components/rules/severity_badge';

const props = {
  title: 'Severity',
  contextId: 'timeline-case',
  enrichedFieldInfo: {
    contextId: 'timeline-case',
    eventId: 'testid',
    fieldType: 'string',
    timelineId: 'timeline-case',
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
  },
};

jest.mock('../../../lib/kibana');

describe('OverviewCardWithActions', () => {
  test('it renders correctly', () => {
    const { getByText } = render(
      <TestProviders>
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
