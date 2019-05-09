/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiGlobalToastList, Toast } from '@elastic/eui';
import React from 'react';
import { connect } from 'react-redux';
import { pure } from 'recompose';
import { ActionCreator } from 'typescript-fsa';

import { appModel, appSelectors, State } from '../../store';
import { appActions } from '../../store/app';

interface OwnProps {
  toastLifeTimeMs?: number;
}

interface ReduxProps {
  errors?: appModel.Error[];
}

interface DispatchProps {
  addError?: ActionCreator<{ id: string; title: string; message: string }>;
  removeError?: ActionCreator<{ id: string }>;
}

type Props = OwnProps & ReduxProps & DispatchProps;

const ErrorToastComponent = pure<Props>(({ toastLifeTimeMs = 10000, errors = [], removeError }) =>
  globalListFromToasts(errorsToToasts(errors), removeError!, toastLifeTimeMs)
);

export const globalListFromToasts = (
  toasts: Toast[],
  removeError: ActionCreator<{ id: string }>,
  toastLifeTimeMs: number
) =>
  toasts.length !== 0 ? (
    <EuiGlobalToastList
      toasts={toasts}
      dismissToast={({ id }) => removeError({ id })}
      toastLifeTimeMs={toastLifeTimeMs}
    />
  ) : null;

export const errorsToToasts = (errors: appModel.Error[]): Toast[] =>
  errors.map(({ id, title, message }) => {
    const toast: Toast = {
      id,
      title,
      color: 'danger',
      iconType: 'alert',
      text: <p>{message}</p>,
    };
    return toast;
  });

const makeMapStateToProps = () => {
  const getErrorSelector = appSelectors.errorsSelector();
  return (state: State) => getErrorSelector(state);
};

export const ErrorToast = connect(
  makeMapStateToProps,
  {
    removeError: appActions.removeError,
  }
)(ErrorToastComponent);
