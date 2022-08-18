/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useCallback } from 'react';
import { EuiButtonIcon } from '@elastic/eui';
import { Teletype } from '../../../common/types/process_tree';
import { DEFAULT_TTY_FONT_SIZE } from '../../../common/constants';

export interface TTYTextSizerDeps {
  tty?: Teletype;
  container: HTMLDivElement | null;
  fontSize: number;
  onFontSizeChanged(newSize: number): void;
}

const LINE_HEIGHT_SCALE_RATIO = 1.3;

export const TTYTextSizer = ({ tty, container, fontSize, onFontSizeChanged }: TTYTextSizerDeps) => {
  const onFit = useCallback(() => {
    if (tty?.rows && container) {
      const lineHeight = DEFAULT_TTY_FONT_SIZE * LINE_HEIGHT_SCALE_RATIO;
      const desiredHeight = tty.rows * lineHeight;
      const targetFontSize = DEFAULT_TTY_FONT_SIZE * (container.offsetHeight / desiredHeight);

      if (fontSize === targetFontSize) {
        onFontSizeChanged(DEFAULT_TTY_FONT_SIZE);
      } else {
        onFontSizeChanged(targetFontSize);
      }
    }
  }, [tty, container, fontSize, onFontSizeChanged]);

  return <EuiButtonIcon iconType="fit" onClick={onFit} />;
};
