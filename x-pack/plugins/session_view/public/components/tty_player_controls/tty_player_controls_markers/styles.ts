/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { CSSObject } from '@emotion/react';
import { useEuiTheme } from '../../../hooks';

type TTYPlayerLineMarkerType = 'output' | 'data_limited';

export const useStyles = () => {
  const { euiTheme, euiVars } = useEuiTheme();
  const cached = useMemo(() => {
    const { border } = euiTheme;

    const markersOverlay: CSSObject = {
      top: 5,
      zIndex: 2,
      position: 'absolute',
      width: '100%',
    };

    const getMarkerBackgroundColor = (type: TTYPlayerLineMarkerType, selected: boolean) => {
      if (type === 'data_limited') {
        return euiVars.terminalOutputMarkerWarning;
      }
      if (selected) {
        return euiVars.terminalOutputMarkerAccent;
      }
      return euiVars.euiColorVis1;
    };

    const marker = (type: TTYPlayerLineMarkerType, selected: boolean): CSSObject => ({
      fontSize: 0,
      overflow: 'hidden',
      position: 'absolute',
      padding: 0,
      width: 3,
      height: 12,
      backgroundColor: getMarkerBackgroundColor(type, selected),
      border: `${border.width.thick} solid ${euiVars.terminalOutputBackground}`,
      borderRadius: border.radius.small,
      boxSizing: 'content-box',
      top: 0,
      pointerEvents: 'none',
      marginLeft: '-3.5px',
    });

    const playHeadThumb: CSSObject = {
      cursor: 'pointer',
      marginTop: -20,
      width: 9,
      height: 30,
      marginLeft: -4.5,
    };

    const customThumb: CSSObject = {
      ...playHeadThumb,
      border: 'none',
      boxShadow: 'none',
      backgroundColor: 'transparent',
      borderRadius: 0,
      opacity: 0,
      appearance: 'none',
    };

    // Custom css for input type range, overrinding some options of EuiRange
    // The custom thumb below is visually hidden and shares the same css properties with the playHead component
    // Source (Chrome): https://developer.mozilla.org/en-US/docs/Web/CSS/::-webkit-slider-thumb
    // Source (Firefox): https://developer.mozilla.org/en-US/docs/Web/CSS/::-moz-range-thumb
    const range: CSSObject = {
      height: 25,
      '&:focus:not(:focus-visible)::-webkit-slider-thumb': {
        boxShadow: 'none',
        backgroundColor: 'transparent',
      },
      "input[type='range']::-webkit-slider-thumb": customThumb,
      "input[type='range']::-moz-range-thumb": customThumb,
      '.euiRangeHighlight__progress': {
        backgroundColor: euiVars.euiColorVis0_behindText,
      },
      '.euiRangeSlider:focus ~ .euiRangeHighlight .euiRangeHighlight__progress': {
        backgroundColor: euiVars.euiColorVis0_behindText,
      },
      '.euiRangeSlider:focus:not(:focus-visible) ~ .euiRangeHighlight .euiRangeHighlight__progress':
        { backgroundColor: euiVars.euiColorVis0_behindText },
      '.euiRangeTrack::after': {
        background: euiVars.terminalOutputSliderBackground,
      },
    };

    const playHead = (type: TTYPlayerLineMarkerType): CSSObject => ({
      ...playHeadThumb,
      position: 'absolute',
      top: 16,
      fill:
        type === 'data_limited'
          ? euiVars.terminalOutputMarkerWarning
          : euiVars.terminalOutputMarkerAccent,
    });

    return {
      marker,
      markersOverlay,
      range,
      playHead,
    };
  }, [euiTheme, euiVars]);

  return cached;
};
