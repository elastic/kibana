/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { connect } from 'react-redux';
import { Dispatch } from 'redux';
import { canUserWrite } from '../../state/selectors/app';
import { getSelectedPage, isWriteable } from '../../state/selectors/workpad';
import { setWriteable } from '../../state/actions/workpad';
import { CommitFn, State } from '../../../types';
import { WorkpadHeader as Component } from './workpad_header.component';

interface Props {
  commit: CommitFn;
}

interface StateProps {
  isWriteable: boolean;
  canUserWrite: boolean;
  selectedPage: string;
}

interface DispatchProps {
  onSetWriteable: (isWriteable: boolean) => void;
}

const mapStateToProps = (state: State) => ({
  isWriteable: isWriteable(state) && canUserWrite(state),
  canUserWrite: canUserWrite(state),
  selectedPage: getSelectedPage(state),
});

const mapDispatchToProps = (dispatch: Dispatch) => ({
  onSetWriteable: (isWorkpadWriteable: boolean) => dispatch(setWriteable(isWorkpadWriteable)),
});

export const WorkpadHeader = connect<StateProps, DispatchProps, Props, State>(
  mapStateToProps,
  mapDispatchToProps
)(Component);
