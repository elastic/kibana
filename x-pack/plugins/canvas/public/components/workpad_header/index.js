/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { compose } from 'recompose';
import { connect } from 'react-redux';
import { canUserWrite, getZoomScale } from '../../state/selectors/app';
import { getSelectedPage, isWriteable } from '../../state/selectors/workpad';
import { setWriteable } from '../../state/actions/workpad';
import { setZoomScale } from '../../state/actions/transient';
import { ZOOM_LEVELS } from '../../../common/lib/constants';
import { WorkpadHeader as Component } from './workpad_header';

const mapStateToProps = state => ({
  isWriteable: isWriteable(state) && canUserWrite(state),
  canUserWrite: canUserWrite(state),
  selectedPage: getSelectedPage(state),
  zoomScale: getZoomScale(state),
});

const mapDispatchToProps = dispatch => ({
  setWriteable: isWriteable => dispatch(setWriteable(isWriteable)),
  setZoomScale: scale => dispatch(setZoomScale(scale)),
});

const mergeProps = (stateProps, dispatchProps, ownProps) => {
  const { setWriteable, setZoomScale, ...remainingDispatchProps } = dispatchProps;
  const scaleIndex = ZOOM_LEVELS.indexOf(stateProps.zoomScale);
  const scaleUp =
    scaleIndex + 1 < ZOOM_LEVELS.length
      ? ZOOM_LEVELS[scaleIndex + 1]
      : ZOOM_LEVELS[scaleIndex.length - 1];
  const scaleDown = scaleIndex - 1 >= 0 ? ZOOM_LEVELS[scaleIndex - 1] : ZOOM_LEVELS[0];
  console.log({ scaleIndex, scaleDown, scaleUp });
  return {
    ...stateProps,
    ...remainingDispatchProps,
    ...ownProps,
    toggleWriteable: () => setWriteable(!stateProps.isWriteable),
    decreaseZoom: () => setZoomScale(scaleDown),
    increaseZoom: () => setZoomScale(scaleUp),
  };
};

export const WorkpadHeader = compose(
  connect(
    mapStateToProps,
    mapDispatchToProps,
    mergeProps
  )
)(Component);
