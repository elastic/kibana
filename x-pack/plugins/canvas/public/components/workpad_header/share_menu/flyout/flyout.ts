/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { connect } from 'react-redux';
import { compose, withProps } from 'recompose';
import { i18n } from '@kbn/i18n';

import {
  getWorkpad,
  getRenderedWorkpad,
  getRenderedWorkpadExpressions,
} from '../../../../state/selectors/workpad';
import {
  downloadRenderedWorkpad,
  downloadRuntime,
  downloadZippedRuntime,
} from '../../../../lib/download_workpad';
import { ShareWebsiteFlyout as Component, Props as ComponentProps } from './flyout.component';
import { State, CanvasWorkpad } from '../../../../../types';
import { CanvasRenderedWorkpad } from '../../../../../shareable_runtime/types';
import { arrayBufferFetch } from '../../../../../common/lib/fetch';
import { API_ROUTE_SHAREABLE_ZIP } from '../../../../../common/lib/constants';
import { renderFunctionNames } from '../../../../../shareable_runtime/supported_renderers';

import { withKibana } from '../../../../../../../../src/plugins/kibana_react/public/';
import { OnCloseFn } from '../share_menu.component';
import { ZIP } from '../../../../../i18n/constants';
import { WithKibanaProps } from '../../../../index';
import { pluginServices } from '../../../../services';

export { OnDownloadFn, OnCopyFn } from './flyout.component';

const strings = {
  getCopyShareConfigMessage: () =>
    i18n.translate('xpack.canvas.workpadHeaderShareMenu.copyShareConfigMessage', {
      defaultMessage: 'Copied share markup to clipboard',
    }),
  getShareableZipErrorTitle: (workpadName: string) =>
    i18n.translate('xpack.canvas.workpadHeaderShareMenu.shareWebsiteErrorTitle', {
      defaultMessage:
        "Failed to create {ZIP} file for '{workpadName}'. The workpad may be too large. You'll need to download the files separately.",
      values: {
        ZIP,
        workpadName,
      },
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

const mapStateToProps = (state: State) => ({
  renderedWorkpad: getRenderedWorkpad(state),
  unsupportedRenderers: getUnsupportedRenderers(state),
  workpad: getWorkpad(state),
});

interface Props {
  onClose: OnCloseFn;
  renderedWorkpad: CanvasRenderedWorkpad;
  unsupportedRenderers: string[];
  workpad: CanvasWorkpad;
}

export const ShareWebsiteFlyout = compose<ComponentProps, Pick<Props, 'onClose'>>(
  connect(mapStateToProps),
  withKibana,
  withProps(
    ({
      unsupportedRenderers,
      renderedWorkpad,
      onClose,
      workpad,
      kibana,
    }: Props & WithKibanaProps): ComponentProps => ({
      unsupportedRenderers,
      onClose,
      onCopy: () => {
        pluginServices.getServices().notify.info(strings.getCopyShareConfigMessage());
      },
      onDownload: (type) => {
        switch (type) {
          case 'share':
            downloadRenderedWorkpad(renderedWorkpad);
            return;
          case 'shareRuntime':
            downloadRuntime(kibana.services.http.basePath.get());
            return;
          case 'shareZip':
            const basePath = kibana.services.http.basePath.get();
            arrayBufferFetch
              .post(`${basePath}${API_ROUTE_SHAREABLE_ZIP}`, JSON.stringify(renderedWorkpad))
              .then((blob) => downloadZippedRuntime(blob.data))
              .catch((err: Error) => {
                pluginServices.getServices().notify.error(err, {
                  title: strings.getShareableZipErrorTitle(workpad.name),
                });
              });
            return;
          default:
            throw new Error(strings.getUnknownExportErrorMessage(type));
        }
      },
    })
  )
)(Component);
