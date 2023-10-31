/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  EuiButtonIcon,
  EuiButtonIconProps,
  EuiFlexGroup,
  EuiFlexItem,
  EuiToolTip,
} from '@elastic/eui';
import type { Teletype } from '../../../common';
import { DEFAULT_TTY_FONT_SIZE } from '../../../common/constants';
import { ZOOM_IN, ZOOM_FIT, ZOOM_OUT } from './translations';
import { useStyles } from './styles';

export interface TTYTextSizerDeps {
  tty?: Teletype;
  containerHeight: number;
  fontSize: number;
  isFullscreen: boolean;
  onFontSizeChanged(newSize: number): void;
}

const commonButtonProps: Partial<EuiButtonIconProps> = {
  display: 'empty',
  size: 's',
  color: 'text',
};

const LINE_HEIGHT_SCALE_RATIO = 1.3;
const MINIMUM_FONT_SIZE = 2;
const MAXIMUM_FONT_SIZE = 20;

export const TTYTextSizer = ({
  tty,
  containerHeight,
  fontSize,
  isFullscreen,
  onFontSizeChanged,
}: TTYTextSizerDeps) => {
  const styles = useStyles();
  const [fit, setFit] = useState(false);

  const onZoomOut = useCallback(() => {
    setFit(false);
    onFontSizeChanged(Math.max(MINIMUM_FONT_SIZE, fontSize - 1));
  }, [fontSize, onFontSizeChanged]);

  const onZoomIn = useCallback(() => {
    setFit(false);
    onFontSizeChanged(Math.min(MAXIMUM_FONT_SIZE, fontSize + 1));
  }, [fontSize, onFontSizeChanged]);

  useEffect(() => {
    if (fit && tty?.rows && containerHeight) {
      const lineHeight = DEFAULT_TTY_FONT_SIZE * LINE_HEIGHT_SCALE_RATIO;
      const desiredHeight = tty.rows * lineHeight;
      const newSize = Math.floor(DEFAULT_TTY_FONT_SIZE * (containerHeight / desiredHeight));

      if (newSize !== fontSize) {
        onFontSizeChanged(newSize);
      }
    }
  }, [isFullscreen, containerHeight, fit, fontSize, onFontSizeChanged, tty?.rows]);

  const onToggleFit = useCallback(() => {
    const newValue = !fit;
    setFit(newValue);

    if (!newValue) {
      onFontSizeChanged(DEFAULT_TTY_FONT_SIZE);
    }
  }, [fit, setFit, onFontSizeChanged]);

  return (
    <EuiFlexGroup
      data-test-subj="sessionView:TTYTextSizer"
      alignItems="center"
      gutterSize="s"
      direction="row"
    >
      <EuiFlexItem>
        <div css={styles.separator} />
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiToolTip content={ZOOM_FIT}>
          <EuiButtonIcon
            data-test-subj="sessionView:TTYZoomFit"
            aria-label={ZOOM_FIT}
            display={fit ? 'fill' : 'empty'}
            iconType={fit ? 'expand' : 'minimize'}
            onClick={onToggleFit}
            size="s"
            color="text"
          />
        </EuiToolTip>
      </EuiFlexItem>
      <EuiFlexItem>
        <div css={styles.separator} />
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiToolTip content={ZOOM_OUT}>
          <EuiButtonIcon
            data-test-subj="sessionView:TTYZoomOut"
            aria-label={ZOOM_OUT}
            iconType="minusInCircle"
            onClick={onZoomOut}
            {...commonButtonProps}
          />
        </EuiToolTip>
      </EuiFlexItem>
      <EuiFlexItem component="span" css={styles.ratio}>
        {`${Math.round((fontSize / DEFAULT_TTY_FONT_SIZE) * 100)}%`}
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiToolTip content={ZOOM_IN}>
          <EuiButtonIcon
            data-test-subj="sessionView:TTYZoomIn"
            aria-label={ZOOM_IN}
            iconType="plusInCircle"
            onClick={onZoomIn}
            {...commonButtonProps}
          />
        </EuiToolTip>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
