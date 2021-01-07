/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { connect } from 'react-redux';
import { canUserWrite } from '../../state/selectors/app';

import {
  getWorkpad,
  getWorkpadName,
  getSelectedPageIndex,
  getSelectedElement,
  isWriteable,
} from '../../state/selectors/workpad';

import { Toolbar as ToolbarComponent } from './toolbar.component';
import { State } from '../../../types';

export const Toolbar = connect((state: State) => ({
  workpadName: getWorkpadName(state),
  workpadId: getWorkpad(state).id,
  totalPages: getWorkpad(state).pages.length,
  selectedPageNumber: getSelectedPageIndex(state) + 1,
  selectedElement: getSelectedElement(state),
  isWriteable: isWriteable(state) && canUserWrite(state),
}))(ToolbarComponent);
