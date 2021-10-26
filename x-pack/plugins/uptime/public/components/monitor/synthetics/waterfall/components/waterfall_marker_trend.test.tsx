/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '../../../../../lib/helper/rtl_helpers';
import { WaterfallMarkerTrend } from './waterfall_marker_trend';
import moment from 'moment';
import { JourneyStep } from '../../../../../../common/runtime_types';
import { TestWrapper } from './waterfall_marker_test_helper';

describe('<WaterfallMarkerTrend />', () => {
  const mockDiff = jest.fn();

  jest.spyOn(moment.prototype, 'diff').mockImplementation(mockDiff);

  let activeStep: JourneyStep | undefined;
  beforeEach(() => {
    activeStep = {
      '@timestamp': '123',
      _id: 'id',
      synthetics: {
        type: 'step/end',
        step: {
          index: 0,
          name: 'test-name',
        },
      },
      monitor: {
        id: 'mon-id',
        check_group: 'group',
        timespan: {
          gte: '1988-10-09T12:00:00.000Z',
          lt: '1988-10-10T12:00:00.000Z',
        },
      },
    };
    mockDiff.mockReturnValue(0);
  });

  const BASE_PATH = 'xyz';

  it('supplies props', () => {
    const { getByLabelText, getByText, getByRole } = render(
      <TestWrapper activeStep={activeStep} basePath={BASE_PATH}>
        <WaterfallMarkerTrend title="test title" field="field" />
      </TestWrapper>,
      {
        core: {
          http: {
            // @ts-expect-error incomplete implementation for testing purposes
            basePath: {
              get: () => BASE_PATH,
            },
          },
        },
      }
    );
    const heading = getByRole('heading');
    expect(heading.innerHTML).toEqual('test title');
    expect(getByLabelText('append title').innerHTML.indexOf(BASE_PATH)).not.toBe(-1);
    expect(getByText('kpi-over-time'));
    expect(getByLabelText('attributes').innerHTML.indexOf('0s')).not.toBe(-1);
    expect(getByLabelText('attributes').innerHTML.indexOf('0h')).toBe(-1);
    expect(getByLabelText('attributes').innerHTML.indexOf('0m')).toBe(-1);
    expect(getByLabelText('attributes').innerHTML.indexOf('0d')).toBe(-1);
  });

  it('handles days', () => {
    mockDiff.mockReturnValue(10);
    const { getByLabelText } = render(
      <TestWrapper activeStep={activeStep} basePath={BASE_PATH}>
        <WaterfallMarkerTrend title="test title" field="field" />
      </TestWrapper>
    );

    const attributesText = getByLabelText('attributes').innerHTML;

    expect(attributesText.indexOf('480s')).toBe(-1);
    expect(attributesText.indexOf('480h')).toBe(-1);
    expect(attributesText.indexOf('480m')).toBe(-1);
    expect(attributesText.indexOf('480d')).not.toBe(-1);
  });

  it('handles hours', () => {
    mockDiff.mockReturnValueOnce(0);
    mockDiff.mockReturnValue(10);
    const { getByLabelText } = render(
      <TestWrapper activeStep={activeStep} basePath={BASE_PATH}>
        <WaterfallMarkerTrend title="test title" field="field" />
      </TestWrapper>
    );

    const attributesText = getByLabelText('attributes').innerHTML;

    expect(attributesText.indexOf('480s')).toBe(-1);
    expect(attributesText.indexOf('480h')).not.toBe(-1);
    expect(attributesText.indexOf('480m')).toBe(-1);
    expect(attributesText.indexOf('480d')).toBe(-1);
  });

  it('handles minutes', () => {
    mockDiff.mockReturnValueOnce(0);
    mockDiff.mockReturnValueOnce(0);
    mockDiff.mockReturnValue(10);
    const { getByLabelText } = render(
      <TestWrapper activeStep={activeStep} basePath={BASE_PATH}>
        <WaterfallMarkerTrend title="test title" field="field" />
      </TestWrapper>
    );

    const attributesText = getByLabelText('attributes').innerHTML;

    expect(attributesText.indexOf('480s')).toBe(-1);
    expect(attributesText.indexOf('480h')).toBe(-1);
    expect(attributesText.indexOf('480m')).not.toBe(-1);
    expect(attributesText.indexOf('480d')).toBe(-1);
  });

  it('returns null for missing active step', () => {
    activeStep = undefined;
    const { container } = render(
      <TestWrapper activeStep={activeStep} basePath={BASE_PATH}>
        <WaterfallMarkerTrend title="test title" field="field" />
      </TestWrapper>
    );
    expect(container.innerHTML).toBe('');
  });
});
