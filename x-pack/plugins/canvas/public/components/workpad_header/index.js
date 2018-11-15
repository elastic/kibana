/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { compose, withState } from 'recompose';
import { connect } from 'react-redux';
import { canUserWrite } from '../../state/selectors/app';
import { getWorkpadName, getSelectedPage, isWriteable } from '../../state/selectors/workpad';
import { setWriteable } from '../../state/actions/workpad';
import { getAssets } from '../../state/selectors/assets';
import { addElement } from '../../state/actions/elements';
import { WorkpadHeader as Component } from './workpad_header';

const mapStateToProps = state => ({
  isWriteable: isWriteable(state) && canUserWrite(state),
  canUserWrite: canUserWrite(state),
  workpadName: getWorkpadName(state),
  selectedPage: getSelectedPage(state),
  hasAssets: Object.keys(getAssets(state)).length ? true : false,
});

const mapDispatchToProps = dispatch => ({
  setWriteable: isWriteable => dispatch(setWriteable(isWriteable)),
  addElement: pageId => partialElement => dispatch(addElement(pageId, partialElement)),
});

const mergeProps = (stateProps, dispatchProps, ownProps) => ({
  ...stateProps,
  ...dispatchProps,
  ...ownProps,
  addElement: dispatchProps.addElement(stateProps.selectedPage),
  toggleWriteable: () => dispatchProps.setWriteable(!stateProps.isWriteable),
});

export const WorkpadHeader = compose(
  withState('showElementModal', 'setShowElementModal', false),
  connect(
    mapStateToProps,
    mapDispatchToProps,
    mergeProps
  )
)(Component);
