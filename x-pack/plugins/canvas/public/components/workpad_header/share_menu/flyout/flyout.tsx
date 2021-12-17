/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC } from 'react';
import { useSelector } from 'react-redux';

import {
  getWorkpad,
  getRenderedWorkpad,
  getRenderedWorkpadExpressions,
} from '../../../../state/selectors/workpad';

import { ShareWebsiteFlyout as FlyoutComponent } from './flyout.component';
import { State, CanvasWorkpad } from '../../../../../types';
import { CanvasRenderedWorkpad } from '../../../../../shareable_runtime/types';
import { renderFunctionNames } from '../../../../../shareable_runtime/supported_renderers';

import { OnCloseFn } from '../share_menu.component';
export type { OnDownloadFn, OnCopyFn } from './flyout.component';

const getUnsupportedRenderers = (state: State) => {
  const renderers: string[] = [];
  const expressions = getRenderedWorkpadExpressions(state);
  expressions.forEach((expression) => {
    if (!renderFunctionNames.includes(expression)) {
      renderers.push(expression);
    }
  });

  return renderers;
};

interface Props {
  onClose: OnCloseFn;
  renderedWorkpad: CanvasRenderedWorkpad;
  unsupportedRenderers: string[];
  workpad: CanvasWorkpad;
}

export const ShareWebsiteFlyout: FC<Pick<Props, 'onClose'>> = ({ onClose }) => {
  const { renderedWorkpad, unsupportedRenderers } = useSelector((state: State) => ({
    renderedWorkpad: getRenderedWorkpad(state),
    unsupportedRenderers: getUnsupportedRenderers(state),
    workpad: getWorkpad(state),
  }));

  return (
    <FlyoutComponent
      onClose={onClose}
      unsupportedRenderers={unsupportedRenderers}
      renderedWorkpad={renderedWorkpad}
    />
  );
};
