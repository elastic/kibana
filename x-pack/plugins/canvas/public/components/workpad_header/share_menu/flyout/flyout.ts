/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { connect } from 'react-redux';
import { compose, withProps } from 'recompose';

import {
  getWorkpad,
  getRenderedWorkpad,
  getRenderedWorkpadExpressions,
} from '../../../../state/selectors/workpad';
import { ShareWebsiteFlyout as Component, Props as ComponentProps } from './flyout.component';
import { State, CanvasWorkpad } from '../../../../../types';
import { CanvasRenderedWorkpad } from '../../../../../shareable_runtime/types';
import { renderFunctionNames } from '../../../../../shareable_runtime/supported_renderers';

import { withKibana } from '../../../../../../../../src/plugins/kibana_react/public/';
import { OnCloseFn } from '../share_menu.component';

export { OnDownloadFn, OnCopyFn } from './flyout.component';

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
    ({ unsupportedRenderers, renderedWorkpad, onClose, workpad }: Props): ComponentProps => ({
      renderedWorkpad,
      unsupportedRenderers,
      onClose,
    })
  )
)(Component);
