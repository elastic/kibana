/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { connect } from 'react-redux';
import { setFullscreen, selectToplevelNodes } from '../../../state/actions/transient';
import { getFullscreen } from '../../../state/selectors/app';
import { FullscreenControl as Component } from './fullscreen_control';

const mapStateToProps = state => ({
  isFullscreen: getFullscreen(state),
});

const mapDispatchToProps = dispatch => ({
  setFullscreen: value => {
    dispatch(setFullscreen(value));
    value && dispatch(selectToplevelNodes([]));
  },
});

export const FullscreenControl = connect(
  mapStateToProps,
  mapDispatchToProps
)(Component);
