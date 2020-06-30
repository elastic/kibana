/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { connect } from 'react-redux';
import { getElementStats } from '../../state/selectors/workpad';
import { ElementConfig as Component } from './element_config';

const mapStateToProps = (state) => ({
  elementStats: getElementStats(state),
});

export const ElementConfig = connect(mapStateToProps)(Component);
