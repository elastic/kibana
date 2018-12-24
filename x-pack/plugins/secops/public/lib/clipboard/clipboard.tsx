/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiGlobalToastList, EuiIcon, EuiText, Toast } from '@elastic/eui';
import copy from 'copy-to-clipboard';
import * as React from 'react';
import styled from 'styled-components';
import uuid from 'uuid';

export type OnCopy = (
  { content, isSuccess }: { content: string | number; isSuccess: boolean }
) => void;

const ToastContainer = styled.div`
  align-items: center;
  display: flex;
  flex-direction: row;
`;

const CopyClipboardIcon = styled(EuiIcon)`
  margin-right: 5px;
`;

const getSuccessToast = (content: string | number): Toast => ({
  id: `copy-success-${uuid.v4()}`,
  color: 'success',
  text: (
    <ToastContainer>
      <CopyClipboardIcon type="copyClipboard" size="m" />
      <EuiText>
        Copied <code>{content}</code> to the clipboard
      </EuiText>
    </ToastContainer>
  ),
  title: `Copied '${content}'`,
});

interface Props {
  children: JSX.Element;
  content: string | number;
  onCopy?: OnCopy;
  toastLifeTimeMs?: number;
}

interface State {
  toasts: Toast[];
}

export class Clipboard extends React.PureComponent<Props, State> {
  constructor(props: Props) {
    super(props);

    this.state = {
      toasts: [],
    };
  }

  public render() {
    const { toastLifeTimeMs = 5000 } = this.props;

    return (
      <>
        <div role="button" data-test-subj="clipboard" onClick={this.onClick}>
          {this.props.children}
        </div>
        <EuiGlobalToastList
          toasts={this.state.toasts}
          dismissToast={this.removeToast}
          toastLifeTimeMs={toastLifeTimeMs}
        />
      </>
    );
  }

  private onClick = (event: React.MouseEvent<HTMLDivElement>) => {
    const { content, onCopy } = this.props;

    event.preventDefault();

    const isSuccess = copy(`${content}`, { debug: true });

    if (onCopy != null) {
      onCopy({ content, isSuccess });
    }

    if (isSuccess) {
      this.setState({
        toasts: [...this.state.toasts, getSuccessToast(content)],
      });
    }
  };

  private removeToast = (removedToast: Toast): void => {
    this.setState(prevState => ({
      toasts: prevState.toasts.filter(toast => toast.id !== removedToast.id),
    }));
  };
}
