/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC } from 'react';
// @ts-expect-error
import { ElementWrapper } from '../../element_wrapper';
import { isGroupId } from '../positioning_utils';
import { WorkpadPageProps } from '../workpad_page';
import { CanvasPage, Shape } from '../../../../types';

export interface StaticPageProps extends WorkpadPageProps {
  elements: Shape[];
  pageStyle?: CanvasPage['style'];
  className: string;
  animationStyle: Record<string, any>;
}

export const StaticWorkpadPage: FC<StaticPageProps> = ({
  pageId,
  pageStyle,
  animationStyle,
  elements,
  height,
  width,
  className,
}) => {
  return (
    <div
      key={pageId}
      id={pageId}
      data-test-subj="canvasWorkpadPage"
      className={`canvasPage kbn-resetFocusState canvasStaticPage ${className}`}
      data-shared-items-container
      style={{ ...pageStyle, ...animationStyle, height, width }}
    >
      {elements
        .filter((node) => !isGroupId(node.id))
        .map((element) => (
          <ElementWrapper key={element.id} element={element} />
        ))}
    </div>
  );
};
