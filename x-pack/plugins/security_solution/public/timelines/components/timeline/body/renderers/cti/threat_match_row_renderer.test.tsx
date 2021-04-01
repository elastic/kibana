/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { shallow } from 'enzyme';
import React from 'react';

import { Ecs } from '../../../../../../../common/ecs';
import { getDetectionAlertFieldsMock } from '../../../../../../common/mock';

import { threatMatchRowRenderer } from './threat_match_row_renderer';

describe('threatMatchRowRenderer', () => {
  let threatMatchFields: ReturnType<typeof getDetectionAlertFieldsMock>;
  let ecs: Ecs;

  beforeEach(() => {
    ecs = {
      _id: 'abcd',
      timestamp: '2018-11-12T19:03:25.936Z',
    };
    threatMatchFields = getDetectionAlertFieldsMock([
      { field: 'threat.indicator.matched.type', value: ['url'] },
    ]);
  });

  describe('#isInstance', () => {
    it('is false for an empty event', () => {
      expect(threatMatchRowRenderer.isInstance(ecs, [])).toBe(false);
    });

    it('is false for an alert with indicator data but no match', () => {
      const indicatorTypeFields = getDetectionAlertFieldsMock([
        { field: 'threat.indicator.type', value: ['url'] },
      ]);
      expect(threatMatchRowRenderer.isInstance(ecs, indicatorTypeFields)).toBe(false);
    });

    it('is false for an alert with threat match fields but no data', () => {
      const emptyThreatMatchFields = getDetectionAlertFieldsMock([
        { field: 'threat.indicator.matched.type', value: [] },
      ]);
      expect(threatMatchRowRenderer.isInstance(ecs, emptyThreatMatchFields)).toBe(false);
    });

    it('is true for an alert event with present indicator match fields', () => {
      expect(threatMatchRowRenderer.isInstance(ecs, threatMatchFields)).toBe(true);
    });
  });

  describe('#renderRow', () => {
    it('renders correctly against snapshot', () => {
      const children = threatMatchRowRenderer.renderRow({
        browserFields: {},
        data: ecs,
        flattenedData: threatMatchFields,
        timelineId: 'test',
      });
      const wrapper = shallow(<span>{children}</span>);
      expect(wrapper).toMatchSnapshot();
    });
  });
});
