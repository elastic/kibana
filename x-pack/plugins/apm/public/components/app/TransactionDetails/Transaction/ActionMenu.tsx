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
  TRACE_ID,
  TRANSACTION_ID
} from 'x-pack/plugins/apm/common/constants';
import { KibanaLink } from 'x-pack/plugins/apm/public/utils/url';
import { Transaction } from 'x-pack/plugins/apm/typings/Transaction';

function getDiscoverQuery(transactionId: string, traceId?: string) {
  let query = `${PROCESSOR_EVENT}:transaction AND ${TRANSACTION_ID}:${transactionId}`;
  if (traceId) {
    query += ` AND ${TRACE_ID}:${traceId}`;
  }
  return {
    _a: {
      interval: 'auto',
      query: {
        language: 'lucene',
        query
      }
    }
  };
}

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

export const DiscoverTransactionLink: React.SFC<ActionMenuProps> = ({
  transaction,
  children
}) => {
  return (
    <KibanaLink
      pathname="/app/kibana"
      hash="/discover"
      query={getDiscoverQuery(
        transaction.transaction.id,
        transaction.version === 'v2' ? transaction.trace.id : undefined
      )}
      children={children}
    />
  );
};

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
        <DiscoverTransactionLink transaction={transaction}>
          View sample document
        </DiscoverTransactionLink>
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
