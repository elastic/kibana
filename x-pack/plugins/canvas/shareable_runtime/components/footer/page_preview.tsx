/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC } from 'react';
import { PageComponent } from '../page';
import { CanvasRenderedPage } from '../../types';
import { useCanvasShareableState } from '../../context';
import { setPageAction } from '../../context/actions';

import css from './page_preview.module.scss';

type onClickFn = (index: number) => void;

export interface Props {
  /**
   * The height of the preview container.
   */
  height: number;

  /**
   * The index of the preview relative to other pages in the workpad.
   */
  index: number;

  /**
   * The handler to invoke if the preview is clicked.
   */
  onClick: onClickFn;

  /**
   * An object describing the page.
   */
  page: CanvasRenderedPage;

  /**
   * The height of the workpad.
   */
  workpadHeight: number;

  /**
   * The width of the workpad.
   */
  workpadWidth: number;
}

/**
 * The small preview of the page shown within the `Scrubber`.
 */
export const PagePreviewComponent: FC<Props> = ({
  height,
  index,
  onClick,
  page,
  workpadHeight,
  workpadWidth,
}) => {
  const scale = height / workpadHeight;

  const transform = {
    height: workpadHeight,
    width: workpadWidth,
    transform: `scale3d(${scale}, ${scale}, 1)`,
  };

  return (
    <div
      className={css.root}
      onClick={() => onClick(index)}
      onKeyPress={() => onClick(index)}
      style={{
        height: workpadHeight * scale,
        width: workpadWidth * scale,
      }}
    >
      <div className={css.preview} style={transform}>
        <PageComponent {...{ page }} height={workpadHeight} width={workpadWidth} />
      </div>
    </div>
  );
};

/**
 * A store-connected container for the `PagePreview` component.
 */
export const PagePreview: FC<Pick<Props, 'index' | 'height'>> = ({ index, height }) => {
  const [{ workpad }, dispatch] = useCanvasShareableState();

  if (!workpad) {
    return null;
  }

  const page = workpad.pages[index];
  const onClick = (pageIndex: number) => dispatch(setPageAction(pageIndex));
  const { height: workpadHeight, width: workpadWidth } = workpad;

  return (
    <PagePreviewComponent {...{ onClick, height, workpadHeight, workpadWidth, page, index }} />
  );
};
