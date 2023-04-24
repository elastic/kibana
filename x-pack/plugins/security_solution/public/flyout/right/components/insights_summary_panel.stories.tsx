/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { Story } from '@storybook/react';
import { css } from '@emotion/react';
import type { InsightsSummaryPanelData } from './insights_summary_panel';
import { InsightsSummaryPanel } from './insights_summary_panel';

export default {
  component: InsightsSummaryPanel,
  title: 'Flyout/InsightsSummaryPanel',
};

export const Default: Story<void> = () => {
  const data: InsightsSummaryPanelData[] = [
    {
      icon: 'image',
      value: 1,
      text: 'this is a test for red',
      color: 'rgb(189,39,30)',
    },
    {
      icon: 'warning',
      value: 2,
      text: 'this is test for orange',
      color: 'rgb(255,126,98)',
    },
    {
      icon: 'warning',
      value: 3,
      text: 'this is test for yellow',
      color: 'rgb(241,216,11)',
    },
  ];

  return (
    <div
      css={css`
        width: 500px;
      `}
    >
      <InsightsSummaryPanel data={data} />
    </div>
  );
};

export const InvalidColor: Story<void> = () => {
  const data: InsightsSummaryPanelData[] = [
    {
      icon: 'image',
      value: 1,
      text: 'this is a test for an invalid color (abc)',
      color: 'abc',
    },
  ];

  return (
    <div
      css={css`
        width: 500px;
      `}
    >
      <InsightsSummaryPanel data={data} />
    </div>
  );
};

export const NoColor: Story<void> = () => {
  const data: InsightsSummaryPanelData[] = [
    {
      icon: 'image',
      value: 1,
      text: 'this is a test for red',
    },
    {
      icon: 'warning',
      value: 2,
      text: 'this is test for orange',
    },
    {
      icon: 'warning',
      value: 3,
      text: 'this is test for yellow',
    },
  ];

  return (
    <div
      css={css`
        width: 500px;
      `}
    >
      <InsightsSummaryPanel data={data} />
    </div>
  );
};

export const LongText: Story<void> = () => {
  const data: InsightsSummaryPanelData[] = [
    {
      icon: 'image',
      value: 1,
      text: 'this is an extremely long text to verify it is properly cut off and and we show three dots at the end',
      color: 'abc',
    },
  ];

  return (
    <div
      css={css`
        width: 500px;
      `}
    >
      <InsightsSummaryPanel data={data} />
    </div>
  );
};
export const LongNumber: Story<void> = () => {
  const data: InsightsSummaryPanelData[] = [
    {
      icon: 'image',
      value: 160000,
      text: 'this is an extremely long value to verify it is properly cut off and and we show three dots at the end',
      color: 'abc',
    },
  ];

  return (
    <div
      css={css`
        width: 500px;
      `}
    >
      <InsightsSummaryPanel data={data} />
    </div>
  );
};

export const NoData: Story<void> = () => {
  const data: InsightsSummaryPanelData[] = [];

  return (
    <div
      css={css`
        width: 500px;
      `}
    >
      <InsightsSummaryPanel data={data} />
    </div>
  );
};
