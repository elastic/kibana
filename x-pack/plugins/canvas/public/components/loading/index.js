/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { connect } from 'react-redux';
import { getSelectedPage, getPageById } from '../../state/selectors/workpad';
import { Loading as Component } from './loading';

const mapStateToProps = state => ({
  backgroundColor: getPageById(state, getSelectedPage(state)).style.background,
});

export const Loading = connect(mapStateToProps)(Component);
