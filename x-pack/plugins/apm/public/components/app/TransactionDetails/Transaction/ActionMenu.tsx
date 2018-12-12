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
import { KibanaLink } from 'x-pack/plugins/apm/public/utils/url';
import { Transaction } from 'x-pack/plugins/apm/typings/Transaction';
import { DiscoverTransactionButton } from '../../../shared/DiscoverButtons/DiscoverTransactionButton';

function getInfraMetricsQuery(transaction: Transaction) {
  const plus5 = new Date(transaction['@timestamp']);
  const minus5 = new Date(transaction['@timestamp']);

  plus5.setMinutes(plus5.getMinutes() + 5);
  minus5.setMinutes(minus5.getMinutes() - 5);

  return {
    from: minus5.getTime(),
    to: plus5.getTime()
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
  readonly transaction: Transaction;
}

interface ActionMenuState {
  readonly isOpen: boolean;
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

  public getInfraActions(transaction: Transaction) {
    const { system } = transaction.context;

    if (!system || !system.hostname) {
      return [];
    }

    return [
      <EuiContextMenuItem icon="infraApp" key="infra-host-metrics">
        <KibanaLink
          pathname="/app/infra"
          hash={`/link-to/host-detail/${system.hostname}`}
          query={getInfraMetricsQuery(transaction)}
        >
          <span>View host metrics (beta)</span>
        </KibanaLink>
      </EuiContextMenuItem>,
      <EuiContextMenuItem icon="infraApp" key="infra-host-logs">
        <KibanaLink
          pathname="/app/infra"
          hash={`/link-to/host-logs/${system.hostname}`}
          query={{ time: new Date(transaction['@timestamp']).getTime() }}
        >
          <span>View host logs (beta)</span>
        </KibanaLink>
      </EuiContextMenuItem>
    ];
  }

  public render() {
    const { transaction } = this.props;

    const items = [
      <EuiContextMenuItem icon="discoverApp" key="discover-transaction">
        <DiscoverTransactionButton transaction={transaction}>
          View sample document
        </DiscoverTransactionButton>
      </EuiContextMenuItem>,
      ...this.getInfraActions(transaction)
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
        <EuiContextMenuPanel items={items} title="Actions" />
      </EuiPopover>
    );
  }
}
