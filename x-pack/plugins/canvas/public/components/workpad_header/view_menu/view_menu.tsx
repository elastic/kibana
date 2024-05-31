/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { FC, useCallback, useContext } from 'react';
import { connect, useDispatch } from 'react-redux';
import { compose, withHandlers } from 'react-recompose';
import { Dispatch } from 'redux';
import { zoomHandlerCreators } from '../../../lib/app_handler_creators';
import { State, CanvasWorkpadBoundingBox } from '../../../../types';
// @ts-expect-error untyped local
import { fetchAllRenderables } from '../../../state/actions/elements';
// @ts-expect-error untyped local
import { setZoomScale, selectToplevelNodes } from '../../../state/actions/transient';
import { setWriteable } from '../../../state/actions/workpad';
import { getZoomScale, canUserWrite } from '../../../state/selectors/app';
import {
  getWorkpadBoundingBox,
  getWorkpadWidth,
  getWorkpadHeight,
  isWriteable,
} from '../../../state/selectors/workpad';
import { WorkpadRoutingContext } from '../../../routes/workpad';
import { ViewMenu as Component, Props as ComponentProps } from './view_menu.component';
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
  doRefresh: () => void;
}

type PropsFromContext =
  | 'enterFullscreen'
  | 'setAutoplayInterval'
  | 'autoplayEnabled'
  | 'autoplayInterval'
  | 'setRefreshInterval'
  | 'refreshInterval';

const mapStateToProps = (state: State) => {
  return {
    zoomScale: getZoomScale(state),
    boundingBox: getWorkpadBoundingBox(state),
    workpadWidth: getWorkpadWidth(state),
    workpadHeight: getWorkpadHeight(state),
    isWriteable: isWriteable(state) && canUserWrite(state),
  };
};

const mapDispatchToProps = (dispatch: Dispatch) => ({
  setZoomScale: (scale: number) => dispatch(setZoomScale(scale)),
  setWriteable: (isWorkpadWriteable: boolean) => dispatch(setWriteable(isWorkpadWriteable)),
  doRefresh: () => dispatch(fetchAllRenderables()),
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
    fitToWindow: () =>
      dispatchProps.setZoomScale(getFitZoomScale(boundingBox, workpadWidth, workpadHeight)),
  };
};

const ViewMenuWithContext: FC<Omit<ComponentProps, PropsFromContext>> = (props) => {
  const dispatch = useDispatch();
  const {
    autoplayInterval,
    setAutoplayInterval,
    setFullscreen,
    setRefreshInterval,
    refreshInterval,
  } = useContext(WorkpadRoutingContext);

  const enterFullscreen = useCallback(() => {
    dispatch(selectToplevelNodes([]));
    setFullscreen(true);
  }, [dispatch, setFullscreen]);

  return (
    <Component
      {...props}
      enterFullscreen={enterFullscreen}
      setAutoplayInterval={setAutoplayInterval}
      autoplayEnabled={true}
      autoplayInterval={autoplayInterval}
      setRefreshInterval={setRefreshInterval}
      refreshInterval={refreshInterval}
    />
  );
};

export const ViewMenu = compose<Omit<ComponentProps, PropsFromContext>, {}>(
  connect(mapStateToProps, mapDispatchToProps, mergeProps),
  withHandlers(zoomHandlerCreators)
)(ViewMenuWithContext);
