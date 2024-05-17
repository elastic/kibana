/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { connect } from 'react-redux';
import { State } from '../../../types';
import { initializeWorkpad } from '../../state/actions/workpad';
import { getSelectedPageIndex, getWorkpad } from '../../state/selectors/workpad';
import { ExportApp as Component } from './export_app.component';

export const ExportApp = connect(
  (state: State) => ({
    workpad: getWorkpad(state),
    selectedPageIndex: getSelectedPageIndex(state),
  }),
  (dispatch) => ({
    initializeWorkpad: () => dispatch(initializeWorkpad()),
  })
)(Component);
