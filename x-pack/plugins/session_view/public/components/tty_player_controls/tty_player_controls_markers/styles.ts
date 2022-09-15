/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { css, CSSObject } from '@emotion/react';
import { useEuiTheme } from '../../../hooks';
import scrubberDefault from './assets/scrubber.svg';
import scrubberYellow from './assets/scrubber-yellow.svg';

export const useStyles = () => {
  const { euiTheme } = useEuiTheme();
  const cached = useMemo(() => {
    const { size } = euiTheme;

    const wrapper = css`
      top: 5px;
      z-index: 2;
      position: absolute;
      width: 100%;
    `;

    const getMarkerBg = (type, selected) => {
      if (type === 'data_limited') {
        return '#F3D371';
      }
      if (selected) {
        return '#F04E98';
      }
      return 'rgb(96, 146, 192)';
    };

    const marker = (type, selected): CSSObject => ({
      fontSize: 0,
      position: 'absolute',
      padding: 0,
      overflow: 'hidden',
      width: 3,
      height: 12,
      backgroundColor: getMarkerBg(type, selected),
      border: '2px solid rgb(29, 30, 35)',
      borderRadius: 4,
      boxSizing: 'content-box',
      top: 0,
      pointerEvents: 'none',
      marginLeft: '-3.5px',
    });

    const range = css`
      height: 25px;
      input[type='range']:focus:not(:focus-visible)::-webkit-slider-thumb {
        box-shadow: none;
        background-color: transparent;
      }
      input[type='range']::-webkit-slider-thumb {
        -webkit-appearance: none;
        cursor: pointer;
        margin-top: -20px;
        width: 9px;
        height: 30px;
        border: none;
        box-shadow: none;
        background-color: transparent;
        border-radius: 0;
        margin-left: -4.5px;
        opacity: 0;
      }
      .euiRangeHighlight__progress {
        background-color: #6dccb1;
        border-radius: 8px 0px 0px 8px;
      }
      .euiRangeSlider:focus:not(:focus-visible) ~ .euiRangeHighlight .euiRangeHighlight__progress {
        background-color: #6dccb1;
      }
      .euiRangeTrack::after {
        background: #343741;
      }
    `;

    const scrubber = (type) => css`
      position: absolute;
      top: 16px;
      cursor: pointer;
      margin-top: -20px;
      width: 9px;
      height: 30px;
      border: none;
      box-shadow: none;
      background-color: transparent;
      border-radius: 0;
      background-image: url(${type === 'data_limited' ? scrubberYellow : scrubberDefault});
      margin-left: -4.5px;
    `;

    return {
      marker,
      wrapper,
      range,
      scrubber,
    };
  }, [euiTheme]);

  return cached;
};
