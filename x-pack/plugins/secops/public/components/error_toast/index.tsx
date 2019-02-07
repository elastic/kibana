/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiGlobalToastList, Toast } from '@elastic/eui';
import { noop } from 'lodash';
import React from 'react';
import uuid from 'uuid';

interface Props {
  toastLifeTimeMs?: number;
}

interface State {
  toasts: Toast[];
}

let showErrorHandler = ({ id = uuid.v4(), title, message }: ShowErrorParams): void => noop();
export const showError = ({ id = uuid.v4(), title, message }: ShowErrorParams) =>
  showErrorHandler({ id, title, message });

interface ShowErrorParams {
  id?: string;
  title: string;
  message: string;
}

export class ErrorToast extends React.PureComponent<Props, State> {
  constructor(props: Props) {
    super(props);

    this.state = {
      toasts: [],
    };
    showErrorHandler = this.showError;
  }

  public showError = ({ id = uuid.v4(), title, message }: ShowErrorParams) => {
    const toast: Toast = {
      id,
      title,
      color: 'danger',
      iconType: 'alert',
      text: <p>{message}</p>,
    };

    this.setState({
      toasts: this.state.toasts.concat(toast),
    });
  };

  public removeError = (removedToast: Toast): void => {
    this.setState(prevState => ({
      toasts: prevState.toasts.filter(toast => toast.id !== removedToast.id),
    }));
  };

  public render() {
    const { toastLifeTimeMs = 10000 } = this.props;
    return (
      <EuiGlobalToastList
        toasts={this.state.toasts}
        dismissToast={this.removeError}
        toastLifeTimeMs={toastLifeTimeMs}
      />
    );
  }
}
