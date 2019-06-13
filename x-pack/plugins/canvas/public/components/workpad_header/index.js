/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { compose, withHandlers } from 'recompose';
import { connect } from 'react-redux';
import { canUserWrite, getZoomScale } from '../../state/selectors/app';
import { getSelectedPage, isWriteable } from '../../state/selectors/workpad';
import { setWriteable } from '../../state/actions/workpad';
import { setZoomScale } from '../../state/actions/transient';
import { zoomHandlerCreators } from '../../lib/app_handler_creators';
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

const mergeProps = (stateProps, dispatchProps, ownProps) => ({
  ...stateProps,
  ...dispatchProps,
  ...ownProps,
  toggleWriteable: () => setWriteable(!stateProps.isWriteable),
});

export const WorkpadHeader = compose(
  connect(
    mapStateToProps,
    mapDispatchToProps,
    mergeProps
  ),
  withHandlers(zoomHandlerCreators)
)(Component);
