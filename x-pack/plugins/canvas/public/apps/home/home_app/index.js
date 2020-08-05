/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { connect } from 'react-redux';
import { resetWorkpad } from '../../../state/actions/workpad';
import { HomeApp as Component } from './home_app';

const mapDispatchToProps = (dispatch) => ({
  onLoad() {
    dispatch(resetWorkpad());
  },
});

export const HomeApp = connect(null, mapDispatchToProps)(Component);
