/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen } from '@testing-library/react';
import React from 'react';

import { InvestigateInTimelineButton } from './investigate_in_timeline_button';
import { TestProviders } from '../../mock';
import { getDataProvider } from './use_action_cell_data_provider';

import { ACTION_INVESTIGATE_IN_TIMELINE } from '../../../detections/components/alerts_table/translations';

jest.mock('../../lib/kibana');

describe('InvestigateInTimelineButton', () => {
  describe('When all props are provided', () => {
    test('it should display the add to timeline button', () => {
      const dataProviders = ['127.0.0.1', '::1', '10.1.2.3', '2001:0DB8:AC10:FE01::'].map(
        (ipValue) => getDataProvider('host.ip', '', ipValue)
      );
      render(
        <TestProviders>
          <InvestigateInTimelineButton asEmptyButton={true} dataProviders={dataProviders} />
        </TestProviders>
      );
      expect(screen.queryByLabelText(ACTION_INVESTIGATE_IN_TIMELINE)).toBeInTheDocument();
    });
  });
});
