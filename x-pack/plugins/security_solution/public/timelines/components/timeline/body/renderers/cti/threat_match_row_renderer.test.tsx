/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { shallow } from 'enzyme';
import React from 'react';

import { getThreatMatchDetectionAlert } from '../../../../../../common/mock';

import { threatMatchRowRenderer } from './threat_match_row_renderer';

describe('threatMatchRowRenderer', () => {
  let threatMatchData: ReturnType<typeof getThreatMatchDetectionAlert>;

  beforeEach(() => {
    threatMatchData = getThreatMatchDetectionAlert();
  });

  describe('#isInstance', () => {
    it('is false for an empty event', () => {
      const emptyEvent = {
        _id: 'my_id',
        '@timestamp': ['2020-11-17T14:48:08.922Z'],
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
    it('renders correctly against snapshot', () => {
      const children = threatMatchRowRenderer.renderRow({
        data: threatMatchData,
        isDraggable: true,
        timelineId: 'test',
      });
      const wrapper = shallow(<span>{children}</span>);
      expect(wrapper).toMatchSnapshot();
    });
  });
});
