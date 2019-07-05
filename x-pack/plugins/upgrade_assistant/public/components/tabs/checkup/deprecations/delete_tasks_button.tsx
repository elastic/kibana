/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import axios from 'axios';
import dedent from 'dedent';
import React, { Fragment, ReactNode } from 'react';

import {
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiLink,
  EuiLoadingSpinner,
  EuiPortal,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import chrome from 'ui/chrome';
import { CURRENT_MAJOR_VERSION } from 'x-pack/plugins/upgrade_assistant/common/version';
import { LoadingState } from '../../../types';

const XSRF = chrome.getXsrfToken();

export const APIClient = axios.create({
  headers: {
    Accept: 'application/json',
    credentials: 'same-origin',
    'Content-Type': 'application/json',
    'kbn-version': XSRF,
    'kbn-xsrf': XSRF,
  },
});

const BACKUP_CONSOLE_LINK = chrome.addBasePath(
  `/app/kibana#/dev_tools/console?command=${encodeURIComponent(
    dedent(`
        # Reindexes the .tasks into a backup index. If this index is large,
        # you may need to use the \`wait_for_completion=false\` flag. Documentation:
        # https://www.elastic.co/guide/en/elasticsearch/reference/current/docs-reindex.html#_url_parameters_3
        POST /_reindex
        {
          "source": { "index": ".tasks" },
          "dest": { "index": ".tasks-v${CURRENT_MAJOR_VERSION}-backup" }
        }
      `)
  )}`
);

interface DeleteButtonState {
  flyoutVisible: boolean;
  deleteStatus?: LoadingState;
  error?: Error;
}

/**
 * This button should only be used to reindex the .tasks index which does not have an upgrade path and must be deleted.
 * This component was not made to be generic in order to avoid any bugs that would allow someone to delete other indices.
 */
export class DeleteTasksButton extends React.Component<{}, DeleteButtonState> {
  constructor(props: {}) {
    super(props);
    this.state = {
      flyoutVisible: false,
    };
  }

  public render() {
    const { flyoutVisible } = this.state;
    const { deleteStatus } = this.state;

    const buttonProps: any = { size: 's', onClick: this.showFlyout };
    let buttonContent: ReactNode = 'Delete';

    switch (deleteStatus) {
      case LoadingState.Loading:
        buttonContent = (
          <span>
            <EuiLoadingSpinner className="upgReindexButton__spinner" size="m" /> Deleting…
          </span>
        );
        break;
      case LoadingState.Success:
        buttonProps.color = 'secondary';
        buttonProps.iconSide = 'left';
        buttonProps.iconType = 'check';
        buttonContent = 'Done';
        break;
      case LoadingState.Error:
        buttonProps.color = 'danger';
        buttonProps.iconSide = 'left';
        buttonProps.iconType = 'cross';
        buttonContent = 'Failed';
        break;
    }

    return (
      <Fragment>
        <EuiButton {...buttonProps}>{buttonContent}</EuiButton>

        {flyoutVisible && this.renderFlyout()}
      </Fragment>
    );
  }

  private renderFlyout() {
    const { deleteStatus } = this.state;

    return (
      <EuiPortal>
        <EuiFlyout onClose={this.closeFlyout} size="m">
          <EuiFlyoutHeader hasBorder>
            <h2>Delete .tasks</h2>
          </EuiFlyoutHeader>
          <EuiFlyoutBody>
            <EuiCallOut title="The .tasks index must be deleted" color="danger" iconType="alert" />
            <EuiSpacer />
            <EuiText grow={false}>
              <p>
                This index contains the results of long-running tasks in Elasticsearch. To upgrade,
                you will need to delete this index. If you still need to access this old information
                you should{' '}
                <EuiLink href={BACKUP_CONSOLE_LINK} target="_blank">
                  reindex into a backup index
                </EuiLink>{' '}
                before proceeding.
              </p>
            </EuiText>
          </EuiFlyoutBody>
          <EuiFlyoutFooter>
            <EuiFlexGroup justifyContent="spaceBetween">
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty iconType="cross" onClick={this.closeFlyout} flush="left">
                  Cancel
                </EuiButtonEmpty>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButton
                  fill
                  color="danger"
                  onClick={this.backupAndDelete}
                  disabled={
                    deleteStatus === LoadingState.Loading || deleteStatus === LoadingState.Success
                  }
                  isLoading={deleteStatus === LoadingState.Loading}
                >
                  {this.flyoutButtonLabel()}
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlyoutFooter>
        </EuiFlyout>
      </EuiPortal>
    );
  }

  private showFlyout = () => {
    this.setState({ flyoutVisible: true });
  };

  private closeFlyout = () => {
    this.setState({ flyoutVisible: false });
  };

  private backupAndDelete = async () => {
    try {
      this.setState({ deleteStatus: LoadingState.Loading });

      await APIClient.post(chrome.addBasePath('/api/upgrade_assistant/delete_tasks_index'));

      this.setState({ deleteStatus: LoadingState.Success });
    } catch (e) {
      this.setState({
        deleteStatus: LoadingState.Error,
        error: e,
      });
    }
  };

  private flyoutButtonLabel = () => {
    switch (this.state.deleteStatus) {
      case LoadingState.Error:
        return 'Try again';
      case LoadingState.Loading:
        return 'Deleting…';
      case LoadingState.Success:
        return 'Done!';
      default:
        return 'Delete';
    }
  };
}
