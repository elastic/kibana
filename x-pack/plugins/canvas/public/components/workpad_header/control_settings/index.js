/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { connect } from 'react-redux';
import { setRefreshInterval } from '../../../state/actions/workpad';
import { getRefreshInterval } from '../../../state/selectors/workpad';
import { ControlSettings as Component } from './control_settings';

const mapStateToProps = state => ({
  refreshInterval: getRefreshInterval(state),
});

const mapDispatchToProps = {
  setRefreshInterval,
};

export const ControlSettings = connect(
  mapStateToProps,
  mapDispatchToProps
)(Component);
