/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState, useCallback } from 'react';

import { euiStyled, css } from '@kbn/kibana-react-plugin/common';
import { TextScale } from '../../../../common/log_text_scale';

export type WrapMode = 'none' | 'pre-wrapped' | 'long';

export const monospaceTextStyle = (scale: TextScale) => css`
  font-family: ${(props) => props.theme.eui.euiCodeFontFamily};
  font-size: ${(props) => {
    switch (scale) {
      case 'large':
        return props.theme.eui.euiFontSizeM;
      case 'medium':
        return props.theme.eui.euiFontSizeS;
      case 'small':
        return props.theme.eui.euiFontSizeXS;
      default:
        return props.theme.eui.euiFontSize;
    }
  }};
  line-height: ${(props) => props.theme.eui.euiLineHeight};
`;

export const hoveredContentStyle = css`
  background-color: ${(props) => props.theme.eui.euiFocusBackgroundColor};
`;

export const highlightedContentStyle = css`
  background-color: ${(props) => props.theme.eui.euiColorHighlight};
`;

export const longWrappedContentStyle = css`
  overflow: visible;
  white-space: pre-wrap;
  word-break: break-all;
`;

export const preWrappedContentStyle = css`
  overflow: hidden;
  white-space: pre;
`;

export const unwrappedContentStyle = css`
  overflow: hidden;
  white-space: nowrap;
`;

interface CharacterDimensions {
  height: number;
  width: number;
}

export const useMeasuredCharacterDimensions = (scale: TextScale) => {
  const [dimensions, setDimensions] = useState<CharacterDimensions>({
    height: 0,
    width: 0,
  });
  const measureElement = useCallback((element: Element | null) => {
    if (!element) {
      return;
    }

    const boundingBox = element.getBoundingClientRect();

    setDimensions({
      height: boundingBox.height,
      width: boundingBox.width,
    });
  }, []);

  const CharacterDimensionsProbe = useMemo(
    () => () =>
      (
        <MonospaceCharacterDimensionsProbe scale={scale} ref={measureElement}>
          X
        </MonospaceCharacterDimensionsProbe>
      ),
    [measureElement, scale]
  );

  return {
    CharacterDimensionsProbe,
    dimensions,
  };
};

interface MonospaceCharacterDimensionsProbe {
  scale: TextScale;
}

const MonospaceCharacterDimensionsProbe = euiStyled.div.attrs(() => ({
  'aria-hidden': true,
}))<MonospaceCharacterDimensionsProbe>`
  visibility: hidden;
  position: absolute;
  height: auto;
  width: auto;
  padding: 0;
  margin: 0;

  ${(props) => monospaceTextStyle(props.scale)};
`;
