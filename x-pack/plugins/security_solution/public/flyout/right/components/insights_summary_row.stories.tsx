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

export const Default: Story<void> = () => (
  <div
    css={css`
      width: 500px;
    `}
  >
    <InsightsSummaryRow
      icon={'image'}
      value={1}
      text={'this is a test for red'}
      color={'rgb(189,39,30)'}
    />
  </div>
);

export const InvalidColor: Story<void> = () => (
  <div
    css={css`
      width: 500px;
    `}
  >
    <InsightsSummaryRow
      icon={'warning'}
      value={2}
      text={'this is a test for an invalid color (abc)'}
      color={'abc'}
    />
  </div>
);

export const NoColor: Story<void> = () => (
  <div
    css={css`
      width: 500px;
    `}
  >
    <InsightsSummaryRow icon={'image'} value={3} text={'this is a test for an no color'} />
  </div>
);

export const LongText: Story<void> = () => (
  <div
    css={css`
      width: 500px;
    `}
  >
    <InsightsSummaryRow
      icon={'image'}
      value={10}
      text={
        'this is an extremely long text to verify it is properly cut off and and we show three dots at the end'
      }
      color={'rgb(255,126,98)'}
    />
  </div>
);

export const LongNumber: Story<void> = () => (
  <div
    css={css`
      width: 500px;
    `}
  >
    <InsightsSummaryRow
      icon={'image'}
      value={160000}
      text={'160000 value shown as compact notation'}
      color={'rgb(241,216,11)'}
    />
  </div>
);

export const Loading: Story<void> = () => (
  <div
    css={css`
      width: 500px;
    `}
  >
    <InsightsSummaryRow loading={true} icon={''} value={0} text={''} />
  </div>
);

export const Error: Story<void> = () => (
  <div
    css={css`
      width: 500px;
    `}
  >
    <InsightsSummaryRow error={true} icon={''} value={0} text={''} />
  </div>
);
