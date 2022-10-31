/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render } from '@testing-library/react';
import React from 'react';
import { getFormattedDuration, RuleDurationFormat } from './rule_duration_format';

describe('RuleDurationFormat', () => {
  describe('getFormattedDuration', () => {
    test('if input value is 0, formatted response is also 0', () => {
      const formattedDuration = getFormattedDuration(0);
      expect(formattedDuration).toEqual('00:00:00:000');
    });

    test('if input value only contains ms, formatted response also only contains ms (SSS)', () => {
      const formattedDuration = getFormattedDuration(999);
      expect(formattedDuration).toEqual('00:00:00:999');
    });

    test('for milliseconds (SSS) to seconds (ss) overflow', () => {
      const formattedDuration = getFormattedDuration(1000);
      expect(formattedDuration).toEqual('00:00:01:000');
    });

    test('for seconds (ss) to minutes (mm) overflow', () => {
      const formattedDuration = getFormattedDuration(60000 + 1);
      expect(formattedDuration).toEqual('00:01:00:001');
    });

    test('for minutes (mm) to hours (hh) overflow', () => {
      const formattedDuration = getFormattedDuration(60000 * 60 + 1);
      expect(formattedDuration).toEqual('01:00:00:001');
    });

    test('for hours (hh) to days (ddd) overflow', () => {
      const formattedDuration = getFormattedDuration(60000 * 60 * 24 + 1);
      expect(formattedDuration).toEqual('001:00:00:00:001');
    });

    test('for overflow with all units up to hours (hh)', () => {
      const formattedDuration = getFormattedDuration(25033167);
      expect(formattedDuration).toEqual('06:57:13:167');
    });

    test('for overflow with all units up to hours (ddd)', () => {
      const formattedDuration = getFormattedDuration(2503316723);
      expect(formattedDuration).toEqual('028:23:21:56:723');
    });

    test('for overflow greater than a year', () => {
      const formattedDuration = getFormattedDuration((60000 * 60 * 24 + 1) * 365);
      expect(formattedDuration).toEqual('> 1 Year');
    });

    test('for max overflow', () => {
      const formattedDuration = getFormattedDuration(Number.MAX_SAFE_INTEGER);
      expect(formattedDuration).toEqual('> 1 Year');
    });
  });

  describe('RuleDurationFormatComponent', () => {
    test('renders correctly with duration and no additional props', () => {
      const { getByTestId } = render(<RuleDurationFormat duration={1000} />);
      expect(getByTestId('rule-duration-format-value')).toHaveTextContent('00:00:01:000');
    });

    test('renders correctly with duration and isSeconds=true', () => {
      const { getByTestId } = render(<RuleDurationFormat duration={1} isSeconds={true} />);
      expect(getByTestId('rule-duration-format-value')).toHaveTextContent('00:00:01:000');
    });

    test('renders correctly with allowZero=true', () => {
      const { getByTestId } = render(<RuleDurationFormat duration={0} allowZero={false} />);
      expect(getByTestId('rule-duration-format-value')).toHaveTextContent('N/A');
    });

    test('renders correctly with max overflow', () => {
      const { getByTestId } = render(<RuleDurationFormat duration={Number.MAX_SAFE_INTEGER} />);
      expect(getByTestId('rule-duration-format-value')).toHaveTextContent('> 1 Year');
    });
  });
});
