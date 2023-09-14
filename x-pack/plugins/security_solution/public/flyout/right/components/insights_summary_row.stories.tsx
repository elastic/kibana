/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { Story } from '@storybook/react';
import { css } from '@emotion/react';
import { InsightsSummaryRow } from './insights_summary_row';

export default {
  component: InsightsSummaryRow,
  title: 'Flyout/InsightsSummaryRow',
};

const wrapper = (children: React.ReactNode) => (
  <div
    css={css`
      width: 500px;
    `}
  >
    {children}
  </div>
);

export const Default: Story<void> = () =>
  wrapper(
    <InsightsSummaryRow
      icon={'image'}
      value={1}
      text={'this is a test for red'}
      color={'rgb(189,39,30)'}
    />
  );

export const InvalidColor: Story<void> = () =>
  wrapper(
    <InsightsSummaryRow
      icon={'warning'}
      value={2}
      text={'this is a test for an invalid color (abc)'}
      color={'abc'}
    />
  );

export const NoColor: Story<void> = () =>
  wrapper(<InsightsSummaryRow icon={'image'} value={3} text={'this is a test for an no color'} />);

export const LongText: Story<void> = () =>
  wrapper(
    <InsightsSummaryRow
      icon={'image'}
      value={10}
      text={
        'this is an extremely long text to verify it is properly cut off and and we show three dots at the end'
      }
      color={'rgb(255,126,98)'}
    />
  );

export const LongNumber: Story<void> = () =>
  wrapper(
    <InsightsSummaryRow
      icon={'image'}
      value={160000}
      text={'160000 value shown as compact notation'}
      color={'rgb(241,216,11)'}
    />
  );

export const Loading: Story<void> = () =>
  wrapper(<InsightsSummaryRow loading={true} icon={''} value={0} text={''} />);

export const Error: Story<void> = () =>
  wrapper(<InsightsSummaryRow error={true} icon={''} value={0} text={''} />);
