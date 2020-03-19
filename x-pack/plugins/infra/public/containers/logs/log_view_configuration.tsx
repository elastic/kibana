/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import createContainer from 'constate';
import { useState } from 'react';

export type TextScale = 'small' | 'medium' | 'large';

export const useLogViewConfiguration = () => {
  // text scale
  const [textScale, setTextScale] = useState<TextScale>('medium');

  // text wrap
  const [textWrap, setTextWrap] = useState<boolean>(true);

  // minimap interval
  const [intervalSize, setIntervalSize] = useState<number>(1000 * 60 * 60 * 24);

  return {
    availableIntervalSizes,
    availableTextScales,
    setTextScale,
    setTextWrap,
    textScale,
    textWrap,
    intervalSize,
    setIntervalSize,
  };
};

export const LogViewConfiguration = createContainer(useLogViewConfiguration);

/**
 * constants
 */

export const availableTextScales: TextScale[] = ['large', 'medium', 'small'];

export const availableIntervalSizes = [
  {
    label: i18n.translate('xpack.infra.mapLogs.oneYearLabel', {
      defaultMessage: '1 Year',
    }),
    intervalSize: 1000 * 60 * 60 * 24 * 365,
  },
  {
    label: i18n.translate('xpack.infra.mapLogs.oneMonthLabel', {
      defaultMessage: '1 Month',
    }),
    intervalSize: 1000 * 60 * 60 * 24 * 30,
  },
  {
    label: i18n.translate('xpack.infra.mapLogs.oneWeekLabel', {
      defaultMessage: '1 Week',
    }),
    intervalSize: 1000 * 60 * 60 * 24 * 7,
  },
  {
    label: i18n.translate('xpack.infra.mapLogs.oneDayLabel', {
      defaultMessage: '1 Day',
    }),
    intervalSize: 1000 * 60 * 60 * 24,
  },
  {
    label: i18n.translate('xpack.infra.mapLogs.oneHourLabel', {
      defaultMessage: '1 Hour',
    }),
    intervalSize: 1000 * 60 * 60,
  },
  {
    label: i18n.translate('xpack.infra.mapLogs.oneMinuteLabel', {
      defaultMessage: '1 Minute',
    }),
    intervalSize: 1000 * 60,
  },
];
