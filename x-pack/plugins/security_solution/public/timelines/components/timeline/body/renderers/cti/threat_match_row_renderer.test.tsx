/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TimelineId } from '../../../../../../../common/types';
import { render } from '@testing-library/react';
import React from 'react';

import { getThreatMatchDetectionAlert, TestProviders } from '../../../../../../common/mock';

import { threatMatchRowRenderer } from './threat_match_row_renderer';
import { useKibana } from '../../../../../../common/lib/kibana';
import { mockTimelines } from '../../../../../../common/mock/mock_timelines_plugin';

jest.mock('../../../../../../common/lib/kibana');
describe('threatMatchRowRenderer', () => {
  let threatMatchData: ReturnType<typeof getThreatMatchDetectionAlert>;

  beforeEach(() => {
    threatMatchData = getThreatMatchDetectionAlert();
    (useKibana as jest.Mock).mockImplementation(() => {
      return {
        services: {
          timelines: { ...mockTimelines },
        },
      };
    });
  });

  describe('#isInstance', () => {
    it('is false for an empty event', () => {
      const emptyEvent = {
        _id: 'my_id',
        '@timestamp': '2020-11-17T14:48:08.922Z',
      };
      expect(threatMatchRowRenderer.isInstance(emptyEvent)).toBe(false);
    });

    it('is false for an alert with indicator data but no match', () => {
      const indicatorTypeData = getThreatMatchDetectionAlert({
        threat: {
          enrichments: [{ indicator: { type: ['url'] } }],
        },
      });
      expect(threatMatchRowRenderer.isInstance(indicatorTypeData)).toBe(false);
    });

    it('is false for an alert with threat match fields but no data', () => {
      const emptyThreatMatchData = getThreatMatchDetectionAlert({
        threat: {
          enrichments: [{ matched: { type: [] } }],
        },
      });
      expect(threatMatchRowRenderer.isInstance(emptyThreatMatchData)).toBe(false);
    });

    it('is true for an alert event with present indicator match fields', () => {
      expect(threatMatchRowRenderer.isInstance(threatMatchData)).toBe(true);
    });
  });

  describe('#renderRow', () => {
    it('renders with minimum required props', () => {
      const children = threatMatchRowRenderer.renderRow({
        data: threatMatchData,
        isDraggable: true,
        scopeId: TimelineId.test,
      });
      const { getByTestId } = render(<TestProviders>{children}</TestProviders>);

      expect(getByTestId('threat-match-details')).toBeInTheDocument();
    });
  });
});
