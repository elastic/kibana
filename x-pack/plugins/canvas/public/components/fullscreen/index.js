/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { connect } from 'react-redux';
import { getFullscreen } from '../../state/selectors/app';
import { Fullscreen as Component } from './fullscreen';

const mapStateToProps = (state) => ({
  isFullscreen: getFullscreen(state),
});

export const Fullscreen = connect(mapStateToProps)(Component);
