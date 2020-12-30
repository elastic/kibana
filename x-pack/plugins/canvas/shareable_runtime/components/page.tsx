/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC } from 'react';
import { RenderedElement } from './rendered_element';
import { CanvasRenderedPage, CanvasRenderedElement } from '../types';
import { useCanvasShareableState } from '../context';

import css from './page.module.scss';

interface ComponentProps {
  /**
   * The height of the page, in pixels.
   */
  height: number;
  /**
   * The width of the page, in pixels.
   */
  width: number;
  /**
   * An object describing the Page, taken from a Shareable Workpad.
   */
  page: CanvasRenderedPage;
}

/**
 * A Page in the Shareable Workpad is conceptually identical to a Page in a Workpad.
 */
export const PageComponent: FC<ComponentProps> = ({ page, height, width }) => {
  const { elements, style, id } = page;

  const output = elements.map((element: CanvasRenderedElement, i) => (
    <RenderedElement key={element.id} element={element} index={i + 1} />
  ));

  return (
    <div {...{ id }} className={css.root} style={{ height, width, ...style }}>
      {output}
    </div>
  );
};

interface Props {
  /**
   * The zero-based index of the page relative others within the workpad.
   */
  index: number;
}

/**
 * A store-connected container for the `Page` component.
 */
export const Page: FC<Props> = ({ index }) => {
  const [{ workpad }] = useCanvasShareableState();

  if (!workpad) {
    return null;
  }

  const { height, width, pages } = workpad;
  const page = pages[index];

  return <PageComponent {...{ page, height, width }} />;
};
