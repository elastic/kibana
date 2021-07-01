/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { i18n } from '@kbn/i18n';

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
import { useNotifyService } from '../../../../services';

import { useDownloadRenderedWorkpad } from '../../../hooks';
import { useDownloadRuntime, useDownloadZippedRuntime } from './hooks';

export { OnDownloadFn, OnCopyFn } from './flyout.component';

const strings = {
  getCopyShareConfigMessage: () =>
    i18n.translate('xpack.canvas.workpadHeaderShareMenu.copyShareConfigMessage', {
      defaultMessage: 'Copied share markup to clipboard',
    }),
  getUnknownExportErrorMessage: (type: string) =>
    i18n.translate('xpack.canvas.workpadHeaderShareMenu.unknownExportErrorMessage', {
      defaultMessage: 'Unknown export type: {type}',
      values: {
        type,
      },
    }),
};

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
  const notifyService = useNotifyService();
  const downloadRenderedWorkpad = useDownloadRenderedWorkpad();
  const downloadRuntime = useDownloadRuntime();
  const downloadZippedRuntime = useDownloadZippedRuntime();

  const { renderedWorkpad, unsupportedRenderers } = useSelector((state: State) => ({
    renderedWorkpad: getRenderedWorkpad(state),
    unsupportedRenderers: getUnsupportedRenderers(state),
    workpad: getWorkpad(state),
  }));

  const onCopy = useCallback(() => notifyService.info(strings.getCopyShareConfigMessage()), [
    notifyService,
  ]);

  const onDownload = useCallback(
    (type: string) => {
      switch (type) {
        case 'share':
          downloadRenderedWorkpad(renderedWorkpad);
          return;
        case 'shareRuntime':
          downloadRuntime();
          return;
        case 'shareZip':
          downloadZippedRuntime(renderedWorkpad);
          return;
        default:
          throw new Error(strings.getUnknownExportErrorMessage(type));
      }
    },
    [downloadRenderedWorkpad, downloadRuntime, downloadZippedRuntime, renderedWorkpad]
  );

  return (
    <FlyoutComponent
      onCopy={onCopy}
      onDownload={onDownload}
      onClose={onClose}
      unsupportedRenderers={unsupportedRenderers}
    />
  );
};
