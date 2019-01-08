/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';

import { EuiButton } from '@elastic/eui';
import { ReindexFlyout } from './flyout';

interface ReindexButtonProps {
  indexName: string;
}

interface ReindexButtonState {
  flyoutVisible: boolean;
}

/**
 * Displays a button that will display a flyout when clicked with the reindexing status for
 * the given `indexName`.
 */
export class ReindexButton extends React.Component<ReindexButtonProps, ReindexButtonState> {
  constructor(props: ReindexButtonProps) {
    super(props);

    this.state = {
      flyoutVisible: false,
    };
  }

  public render() {
    const { indexName } = this.props;
    const { flyoutVisible } = this.state;

    return (
      <Fragment>
        <EuiButton size="s" onClick={this.showFlyout}>
          Reindex
        </EuiButton>

        {flyoutVisible && <ReindexFlyout indexName={indexName} closeFlyout={this.closeFlyout} />}
      </Fragment>
    );
  }

  private showFlyout = () => {
    this.setState({ flyoutVisible: true });
  };

  private closeFlyout = () => {
    this.setState({ flyoutVisible: false });
  };
}
