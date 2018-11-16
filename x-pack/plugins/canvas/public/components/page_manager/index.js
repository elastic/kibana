/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { connect } from 'react-redux';
import { compose, withState } from 'recompose';
import * as pageActions from '../../state/actions/pages';
import { canUserWrite } from '../../state/selectors/app';
import { getSelectedPage, getWorkpad, getPages, isWriteable } from '../../state/selectors/workpad';
import { PageManager as Component } from './page_manager';

const mapStateToProps = state => ({
  isWriteable: isWriteable(state) && canUserWrite(state),
  pages: getPages(state),
  selectedPage: getSelectedPage(state),
  workpadId: getWorkpad(state).id,
});

const mapDispatchToProps = dispatch => ({
  addPage: () => dispatch(pageActions.addPage()),
  movePage: (id, position) => dispatch(pageActions.movePage(id, position)),
  duplicatePage: id => dispatch(pageActions.duplicatePage(id)),
  removePage: id => dispatch(pageActions.removePage(id)),
});

export const PageManager = compose(
  connect(
    mapStateToProps,
    mapDispatchToProps
  ),
  withState('deleteId', 'setDeleteId', null)
)(Component);
