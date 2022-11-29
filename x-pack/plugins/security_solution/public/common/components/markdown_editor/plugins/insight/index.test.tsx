/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { render, screen } from '@testing-library/react';
import React from 'react';
import moment from 'moment';
import { TestProviders } from '../../../../mock';
import {
  DEFAULT_FROM,
  DEFAULT_APP_TIME_RANGE,
  DEFAULT_TO,
} from '../../../../../../common/constants';
import { KibanaServices } from '../../../../lib/kibana';
import type { DefaultTimeRangeSetting } from '../../../../utils/default_date_settings';
import { renderer as Renderer } from '.';
import type { InvestigateInTimelineButtonProps } from '../../../event_details/table/investigate_in_timeline_button';

jest.mock('../../../../lib/kibana');
const mockGetServices = KibanaServices.get as jest.Mock;

jest.mock('../../../event_details/table/investigate_in_timeline_button', () => {
  const originalModule = jest.requireActual(
    '../../../event_details/table/investigate_in_timeline_button'
  );
  return {
    ...originalModule,
    InvestigateInTimelineButton: function InvestigateInTimelineButton(
      props: InvestigateInTimelineButtonProps
    ) {
      return (
        <div
          data-test-subj="insight-investigate-in-timeline-button"
          data-timerange-from={props.timeRange?.from}
          data-timerange-to={props.timeRange?.to}
          data-timerange-kind={props.timeRange?.kind}
        />
      );
    },
  };
});
const mockTimeRange = (
  timeRange: DefaultTimeRangeSetting = { from: DEFAULT_FROM, to: DEFAULT_TO }
) => {
  mockGetServices.mockImplementation(() => ({
    uiSettings: {
      get: (key: string) => {
        switch (key) {
          case DEFAULT_APP_TIME_RANGE:
            return timeRange;
          default:
            throw new Error(`Unexpected config key: ${key}`);
        }
      },
    },
  }));
};

describe('insight component renderer', () => {
  beforeEach(() => {
    mockTimeRange(null);
  });
  it('renders correctly with valid date strings with no timestamp from results', () => {
    render(
      <TestProviders>
        <Renderer
          label={'test label'}
          description={'test description'}
          providers={
            '[[{"field":"event.id","value":"kibana.alert.original_event.id","type":"parameter"}],[{"field":"event.category","value":"network","type":"literal"},{"field":"process.pid","value":"process.pid","type":"parameter"}]]'
          }
        />
      </TestProviders>
    );
    const timelineButton = screen.getByTestId('insight-investigate-in-timeline-button');
    const relativeTo = timelineButton.getAttribute('data-timerange-to') || '';
    const relativeFrom = timelineButton.getAttribute('data-timerange-from') || '';
    expect(timelineButton).toHaveAttribute('data-timerange-kind', 'relative');
    try {
      const toDate = new Date(relativeTo);
      const fromDate = new Date(relativeFrom);
      expect(moment(toDate).isValid()).toBe(true);
      expect(moment(fromDate).isValid()).toBe(true);
    } catch {
      expect(false).toBe(true);
    }
  });
});
