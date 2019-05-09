/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { darken, transparentize } from 'polished';
import React, { useMemo, useState, useCallback } from 'react';

import euiStyled, { css } from '../../../../../../common/eui_styled_components';
import { TextScale } from '../../../../common/log_text_scale';

export const monospaceTextStyle = (scale: TextScale) => css`
  font-family: ${props => props.theme.eui.euiCodeFontFamily};
  font-size: ${props => {
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
  }}
  line-height: ${props => props.theme.eui.euiLineHeight};
`;

export const hoveredContentStyle = css`
  background-color: ${props =>
    props.theme.darkMode
      ? transparentize(0.9, darken(0.05, props.theme.eui.euiColorHighlight))
      : darken(0.05, props.theme.eui.euiColorHighlight)};
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
    () => () => (
      <MonospaceCharacterDimensionsProbe scale={scale} innerRef={measureElement}>
        X
      </MonospaceCharacterDimensionsProbe>
    ),
    [scale]
  );

  return {
    CharacterDimensionsProbe,
    dimensions,
  };
};

const MonospaceCharacterDimensionsProbe = euiStyled.div.attrs<{
  scale: TextScale;
}>({
  'aria-hidden': true,
})`
  visibility: hidden;
  position: absolute;
  height: auto;
  width: auto;
  padding: 0;
  margin: 0;

  ${props => monospaceTextStyle(props.scale)}
`;
