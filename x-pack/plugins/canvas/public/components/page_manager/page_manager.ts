/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Dispatch } from 'redux';
import { connect } from 'react-redux';
// @ts-expect-error untyped local
import * as pageActions from '../../state/actions/pages';
import { canUserWrite } from '../../state/selectors/app';
import { getSelectedPage, getWorkpad, getPages, isWriteable } from '../../state/selectors/workpad';
import { DEFAULT_WORKPAD_CSS } from '../../../common/lib/constants';
import { PageManager as Component } from './page_manager.component';
import { State } from '../../../types';

const mapStateToProps = (state: State) => ({
  isWriteable: isWriteable(state) && canUserWrite(state),
  pages: getPages(state),
  selectedPage: getSelectedPage(state),
  workpadId: getWorkpad(state).id,
  workpadCSS: getWorkpad(state).css || DEFAULT_WORKPAD_CSS,
});

const mapDispatchToProps = (dispatch: Dispatch) => ({
  onAddPage: () => dispatch(pageActions.addPage()),
  onMovePage: (id: string, position: number) => dispatch(pageActions.movePage(id, position)),
  onRemovePage: (id: string) => dispatch(pageActions.removePage(id)),
});

export const PageManager = connect(mapStateToProps, mapDispatchToProps)(Component);
