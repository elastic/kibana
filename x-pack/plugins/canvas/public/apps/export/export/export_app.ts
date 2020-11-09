/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { connect } from 'react-redux';
import { initializeWorkpad } from '../../../state/actions/workpad';
import { getWorkpad, getSelectedPageIndex } from '../../../state/selectors/workpad';
import { ExportApp as Component } from './export_app.component';
import { State } from '../../../../types';

export const ExportApp = connect(
  (state: State) => ({
    workpad: getWorkpad(state),
    selectedPageIndex: getSelectedPageIndex(state),
  }),
  (dispatch) => ({
    initializeWorkpad: () => dispatch(initializeWorkpad()),
  })
)(Component);
