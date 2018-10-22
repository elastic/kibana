/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiButton,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiPopover
} from '@elastic/eui';
import React from 'react';
import {
  PROCESSOR_EVENT,
  TRANSACTION_ID
} from 'x-pack/plugins/apm/common/constants';
import { KibanaLink } from 'x-pack/plugins/apm/public/utils/url';
import { Transaction } from 'x-pack/plugins/apm/typings/Transaction';

function getDiscoverQuery(transactionId: string) {
  return {
    _a: {
      interval: 'auto',
      query: {
        language: 'lucene',
        query: `${PROCESSOR_EVENT}:transaction AND ${TRANSACTION_ID}:${transactionId}`
      }
    }
  };
}

function ActionMenuButton({ onClick }: { onClick: () => void }) {
  return (
    <EuiButton iconType="arrowDown" iconSide="right" onClick={onClick}>
      Actions
    </EuiButton>
  );
}

interface ActionMenuProps {
  transaction: Transaction;
}

interface ActionMenuState {
  isOpen: boolean;
}

export class ActionMenu extends React.Component<
  ActionMenuProps,
  ActionMenuState
> {
  public state = {
    isOpen: false
  };

  public toggle = () => {
    this.setState(state => ({ isOpen: !state.isOpen }));
  };

  public close = () => {
    this.setState({ isOpen: false });
  };

  public render() {
    const { transaction } = this.props;

    const items = [
      <EuiContextMenuItem icon="discoverApp">
        <KibanaLink
          pathname="/app/kibana"
          hash="/discover"
          query={getDiscoverQuery(transaction.transaction.id)}
        >
          {'View transaction in Discover'}
        </KibanaLink>
      </EuiContextMenuItem>,
      <EuiContextMenuItem icon="infraApp">
        <KibanaLink
          pathname="/app/infra"
          hash={`/link-to/host-detail/${transaction.host.name}`}
        >
          {`View logs for this host`}
        </KibanaLink>
      </EuiContextMenuItem>
    ];

    return (
      <EuiPopover
        id="transactionActionMenu"
        button={<ActionMenuButton onClick={this.toggle} />}
        isOpen={this.state.isOpen}
        closePopover={this.close}
        anchorPosition="downRight"
        panelPaddingSize="none"
      >
        <EuiContextMenuPanel items={items} />
      </EuiPopover>
    );
  }
}
