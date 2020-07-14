/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { connect } from 'react-redux';
import { compose, withHandlers } from 'recompose';
import { Dispatch } from 'redux';
import { withKibana } from '../../../../../../../src/plugins/kibana_react/public/';
import { zoomHandlerCreators } from '../../../lib/app_handler_creators';
import { State, CanvasWorkpadBoundingBox } from '../../../../types';
// @ts-expect-error untyped local
import { fetchAllRenderables } from '../../../state/actions/elements';
// @ts-expect-error untyped local
import { setZoomScale, setFullscreen, selectToplevelNodes } from '../../../state/actions/transient';
import {
  setWriteable,
  setRefreshInterval,
  enableAutoplay,
  setAutoplayInterval,
} from '../../../state/actions/workpad';
import { getZoomScale, canUserWrite } from '../../../state/selectors/app';
import {
  getWorkpadBoundingBox,
  getWorkpadWidth,
  getWorkpadHeight,
  isWriteable,
  getRefreshInterval,
  getAutoplay,
} from '../../../state/selectors/workpad';
import { ViewMenu as Component, Props as ComponentProps } from './view_menu';
import { getFitZoomScale } from './lib/get_fit_zoom_scale';

interface StateProps {
  zoomScale: number;
  boundingBox: CanvasWorkpadBoundingBox;
  workpadWidth: number;
  workpadHeight: number;
  isWriteable: boolean;
}

interface DispatchProps {
  setWriteable: (isWorkpadWriteable: boolean) => void;
  setZoomScale: (scale: number) => void;
  setFullscreen: (showFullscreen: boolean) => void;
}

const mapStateToProps = (state: State) => {
  const { enabled, interval } = getAutoplay(state);

  return {
    zoomScale: getZoomScale(state),
    boundingBox: getWorkpadBoundingBox(state),
    workpadWidth: getWorkpadWidth(state),
    workpadHeight: getWorkpadHeight(state),
    isWriteable: isWriteable(state) && canUserWrite(state),
    refreshInterval: getRefreshInterval(state),
    autoplayEnabled: enabled,
    autoplayInterval: interval,
  };
};

const mapDispatchToProps = (dispatch: Dispatch) => ({
  setZoomScale: (scale: number) => dispatch(setZoomScale(scale)),
  setWriteable: (isWorkpadWriteable: boolean) => dispatch(setWriteable(isWorkpadWriteable)),
  setFullscreen: (value: boolean) => {
    dispatch(setFullscreen(value));

    if (value) {
      dispatch(selectToplevelNodes([]));
    }
  },
  doRefresh: () => dispatch(fetchAllRenderables()),
  setRefreshInterval: (interval: number) => dispatch(setRefreshInterval(interval)),
  enableAutoplay: (autoplay: number) => dispatch(enableAutoplay(!!autoplay)),
  setAutoplayInterval: (interval: number) => dispatch(setAutoplayInterval(interval)),
});

const mergeProps = (
  stateProps: StateProps,
  dispatchProps: DispatchProps,
  ownProps: ComponentProps
): ComponentProps => {
  const { boundingBox, workpadWidth, workpadHeight, ...remainingStateProps } = stateProps;

  return {
    ...remainingStateProps,
    ...dispatchProps,
    ...ownProps,
    toggleWriteable: () => dispatchProps.setWriteable(!stateProps.isWriteable),
    enterFullscreen: () => dispatchProps.setFullscreen(true),
    fitToWindow: () =>
      dispatchProps.setZoomScale(getFitZoomScale(boundingBox, workpadWidth, workpadHeight)),
  };
};

export const ViewMenu = compose<ComponentProps, {}>(
  connect(mapStateToProps, mapDispatchToProps, mergeProps),
  withKibana,
  withHandlers(zoomHandlerCreators)
)(Component);
