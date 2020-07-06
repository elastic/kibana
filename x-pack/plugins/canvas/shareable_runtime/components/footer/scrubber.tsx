/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC } from 'react';
import classnames from 'classnames';
import { PagePreview } from './page_preview';
import { useCanvasShareableState } from '../../context';

import css from './scrubber.module.scss';
import { CanvasRenderedPage } from '../../types';

interface Props {
  /**
   * True if the scrubber is currently visible, false otherwise.
   */
  isScrubberVisible: boolean;

  /**
   * A collection of objects describing the pages within the workpad to be
   * displayed in the Scrubber.
   */
  pages: CanvasRenderedPage[];
}

const THUMBNAIL_HEIGHT = 100;

/**
 * The panel of previews of the pages in the workpad, allowing one to select and
 * navigate to a specific page.
 */
export const ScrubberComponent: FC<Props> = ({ isScrubberVisible, pages }) => {
  const className = isScrubberVisible ? classnames(css.root, css.visible) : css.root;

  const slides = pages.map((page, index) => (
    <PagePreview key={page.id} height={THUMBNAIL_HEIGHT} {...{ index }} />
  ));

  return (
    <div className={className}>
      <div className={css.slideContainer}>{slides}</div>
    </div>
  );
};

/**
 * A store-connected container for the `Scrubber` component.
 */
export const Scrubber: FC<{}> = () => {
  const [{ workpad, footer }] = useCanvasShareableState();

  if (!workpad) {
    return null;
  }

  const { pages } = workpad;
  const { isScrubberVisible } = footer;

  return <ScrubberComponent {...{ pages, isScrubberVisible }} />;
};
