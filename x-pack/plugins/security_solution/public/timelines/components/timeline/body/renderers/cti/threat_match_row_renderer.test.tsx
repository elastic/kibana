/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { shallow } from 'enzyme';
import React from 'react';

import { getDetectionAlertMock } from '../../../../../../common/mock';

import { threatMatchRowRenderer } from './threat_match_row_renderer';

describe('threatMatchRowRenderer', () => {
  let alertMock: ReturnType<typeof getDetectionAlertMock>;

  beforeEach(() => {
    alertMock = getDetectionAlertMock({
      threat: {
        indicator: [
          {
            matched: {
              type: 'url',
            },
          },
        ],
      },
    });
  });

  describe('#isInstance', () => {
    it('is false for a minimal event', () => {
      const minimalEvent = {
        _id: 'abcd',
        timestamp: '2018-11-12T19:03:25.936Z',
      };
      expect(threatMatchRowRenderer.isInstance(minimalEvent)).toBe(false);
    });

    it('is false for an alert with indicator data but no match', () => {
      const indicatorEvent = getDetectionAlertMock({
        threat: {
          indicator: {
            type: 'url',
          },
        },
      });
      expect(threatMatchRowRenderer.isInstance(indicatorEvent)).toBe(false);
    });

    it('is true for any event with indicator match fields', () => {
      const indicatorMatchEvent = {
        _id: 'abc',
        threat: {
          indicator: {
            matched: {
              type: 'ip',
            },
          },
        },
      };
      expect(threatMatchRowRenderer.isInstance(indicatorMatchEvent)).toBe(true);
    });

    it('is true for an alert enriched by an indicator match', () => {
      expect(threatMatchRowRenderer.isInstance(alertMock)).toBe(true);
    });
  });

  describe('#renderRow', () => {
    it('renders correctly against snapshot', () => {
      const children = threatMatchRowRenderer.renderRow({
        browserFields: {},
        data: alertMock,
        timelineId: 'test',
      });
      const wrapper = shallow(<span>{children}</span>);
      expect(wrapper).toMatchSnapshot();
    });
  });
});
