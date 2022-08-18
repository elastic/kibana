/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useCallback, useMemo } from 'react';
import { EuiButtonIcon, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { Teletype } from '../../../common/types/process_tree';
import { DEFAULT_TTY_FONT_SIZE } from '../../../common/constants';

export interface TTYTextSizerDeps {
  tty?: Teletype;
  container: HTMLDivElement | null;
  fontSize: number;
  onFontSizeChanged(newSize: number): void;
}

const LINE_HEIGHT_SCALE_RATIO = 1.3;
const MINIMUM_FONT_SIZE = 2;
const MAXIMUM_FONT_SIZE = 20;

export const TTYTextSizer = ({ tty, container, fontSize, onFontSizeChanged }: TTYTextSizerDeps) => {
  const onFitFontSize = useMemo(() => {
    if (tty?.rows && container?.offsetHeight) {
      const lineHeight = DEFAULT_TTY_FONT_SIZE * LINE_HEIGHT_SCALE_RATIO;
      const desiredHeight = tty.rows * lineHeight;
      return DEFAULT_TTY_FONT_SIZE * (container.offsetHeight / desiredHeight);
    }

    return DEFAULT_TTY_FONT_SIZE;
  }, [container?.offsetHeight, tty?.rows]);

  const onFit = useCallback(() => {
    if (fontSize === onFitFontSize || onFitFontSize > DEFAULT_TTY_FONT_SIZE) {
      onFontSizeChanged(DEFAULT_TTY_FONT_SIZE);
    } else {
      onFontSizeChanged(onFitFontSize);
    }
  }, [fontSize, onFontSizeChanged, onFitFontSize]);

  const onZoomOut = useCallback(() => {
    onFontSizeChanged(Math.max(MINIMUM_FONT_SIZE, fontSize - 2));
  }, [fontSize, onFontSizeChanged]);

  const onZoomIn = useCallback(() => {
    onFontSizeChanged(Math.min(MAXIMUM_FONT_SIZE, fontSize + 2));
  }, [fontSize, onFontSizeChanged]);

  return (
    <EuiFlexGroup alignItems="center" gutterSize="s" direction="row">
      <EuiFlexItem>
        <EuiButtonIcon iconType="magnifyWithPlus" onClick={onZoomIn} />
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiButtonIcon
          iconType={onFitFontSize === fontSize ? 'expand' : 'minimize'}
          onClick={onFit}
        />
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiButtonIcon iconType="magnifyWithMinus" onClick={onZoomOut} />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
