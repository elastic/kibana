/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useCallback, useMemo } from 'react';
import { EuiButtonIcon, EuiFlexGroup, EuiFlexItem, EuiToolTip } from '@elastic/eui';
import { Teletype } from '../../../common/types/process_tree';
import { DEFAULT_TTY_FONT_SIZE } from '../../../common/constants';
import { ZOOM_IN, ZOOM_FIT, ZOOM_OUT } from './translations';
import { useStyles } from './styles';

export interface TTYTextSizerDeps {
  tty?: Teletype;
  containerHeight: number;
  fontSize: number;
  onFontSizeChanged(newSize: number): void;
}

const LINE_HEIGHT_SCALE_RATIO = 1.3;
const MINIMUM_FONT_SIZE = 2;
const MAXIMUM_FONT_SIZE = 20;

export const TTYTextSizer = ({
  tty,
  containerHeight,
  fontSize,
  onFontSizeChanged,
}: TTYTextSizerDeps) => {
  const styles = useStyles();
  const onFitFontSize = useMemo(() => {
    if (tty?.rows && containerHeight) {
      const lineHeight = DEFAULT_TTY_FONT_SIZE * LINE_HEIGHT_SCALE_RATIO;
      const desiredHeight = tty.rows * lineHeight;
      return DEFAULT_TTY_FONT_SIZE * (containerHeight / desiredHeight);
    }

    return DEFAULT_TTY_FONT_SIZE;
  }, [containerHeight, tty?.rows]);

  const onFit = useCallback(() => {
    if (fontSize === onFitFontSize || onFitFontSize > DEFAULT_TTY_FONT_SIZE) {
      onFontSizeChanged(DEFAULT_TTY_FONT_SIZE);
    } else {
      onFontSizeChanged(onFitFontSize);
    }
  }, [fontSize, onFontSizeChanged, onFitFontSize]);

  const onZoomOut = useCallback(() => {
    onFontSizeChanged(Math.max(MINIMUM_FONT_SIZE, fontSize - 1));
  }, [fontSize, onFontSizeChanged]);

  const onZoomIn = useCallback(() => {
    onFontSizeChanged(Math.min(MAXIMUM_FONT_SIZE, fontSize + 1));
  }, [fontSize, onFontSizeChanged]);

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
            iconType={onFitFontSize === fontSize ? 'expand' : 'minimize'}
            onClick={onFit}
          />
        </EuiToolTip>
      </EuiFlexItem>
      <EuiFlexItem>
        <div css={styles.separator} />
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiToolTip content={ZOOM_IN}>
          <EuiButtonIcon
            data-test-subj="sessionView:TTYZoomIn"
            aria-label={ZOOM_IN}
            iconType="plusInCircle"
            onClick={onZoomIn}
          />
        </EuiToolTip>
      </EuiFlexItem>
      <EuiFlexItem component="span" css={styles.ratio}>
        {`${Math.round((fontSize / DEFAULT_TTY_FONT_SIZE) * 100)}%`}
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiToolTip content={ZOOM_OUT}>
          <EuiButtonIcon
            data-test-subj="sessionView:TTYZoomOut"
            aria-label={ZOOM_OUT}
            iconType="minusInCircle"
            onClick={onZoomOut}
          />
        </EuiToolTip>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
