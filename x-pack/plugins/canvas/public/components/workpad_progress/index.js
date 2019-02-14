/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { connect } from 'react-redux';
import { getInFlight } from '../../state/selectors/resolved_args';
import { getFullscreen } from '../../state/selectors/app';
import { WorkpadProgress as Component } from './workpad_progress';

const mapStateToProps = state => ({
  inFlight: getInFlight(state),
  isFullScreen: getFullscreen(state),
});

export const WorkpadProgress = connect(mapStateToProps)(Component);
