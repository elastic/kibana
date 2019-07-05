/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiButtonEmpty,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLink,
  EuiPopover
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { Location } from 'history';
import idx from 'idx';
import React from 'react';
import { getKibanaHref } from 'x-pack/plugins/apm/public/components/shared/Links/url_helpers';
import { StringMap } from 'x-pack/plugins/apm/typings/common';
import {
  Transaction,
  TransactionV2
} from 'x-pack/plugins/apm/typings/es_schemas/Transaction';
import { getDiscoverQuery } from '../Links/DiscoverLinks/DiscoverTransactionLink';
import { QueryWithIndexPattern } from '../Links/DiscoverLinks/QueryWithIndexPattern';

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
    <EuiButtonEmpty iconType="arrowDown" iconSide="right" onClick={onClick}>
      {i18n.translate('xpack.apm.transactionActionMenu.actionsButtonLabel', {
        defaultMessage: 'Actions'
      })}
    </EuiButtonEmpty>
  );
}

interface Props {
  readonly transaction: Transaction;
  readonly location: Location;
}

interface State {
  readonly isOpen: boolean;
}

export class TransactionActionMenu extends React.Component<Props, State> {
  public state: State = {
    isOpen: false
  };

  public toggle = () => {
    this.setState(state => ({ isOpen: !state.isOpen }));
  };

  public close = () => {
    this.setState({ isOpen: false });
  };

  public getInfraActions() {
    const { transaction, location } = this.props;
    const hostName = idx(transaction, _ => _.context.system.hostname);
    const podId = idx(transaction as TransactionV2, _ => _.kubernetes.pod.uid);
    const containerId = idx(
      transaction as TransactionV2,
      _ => _.docker.container.id
    );
    const pathname = '/app/infra';
    const time = new Date(transaction['@timestamp']).getTime();
    const infraMetricsQuery = getInfraMetricsQuery(transaction);

    return [
      {
        icon: 'loggingApp',
        label: i18n.translate(
          'xpack.apm.transactionActionMenu.showPodLogsLinkLabel',
          { defaultMessage: 'Show pod logs' }
        ),
        target: podId,
        hash: `/link-to/pod-logs/${podId}`,
        query: { time }
      },

      {
        icon: 'loggingApp',
        label: i18n.translate(
          'xpack.apm.transactionActionMenu.showContainerLogsLinkLabel',
          { defaultMessage: 'Show container logs' }
        ),
        target: containerId,
        hash: `/link-to/container-logs/${containerId}`,
        query: { time }
      },

      {
        icon: 'loggingApp',
        label: i18n.translate(
          'xpack.apm.transactionActionMenu.showHostLogsLinkLabel',
          { defaultMessage: 'Show host logs' }
        ),
        target: hostName,
        hash: `/link-to/host-logs/${hostName}`,
        query: { time }
      },

      {
        icon: 'infraApp',
        label: i18n.translate(
          'xpack.apm.transactionActionMenu.showPodMetricsLinkLabel',
          { defaultMessage: 'Show pod metrics' }
        ),
        target: podId,
        hash: `/link-to/pod-detail/${podId}`,
        query: infraMetricsQuery
      },

      {
        icon: 'infraApp',
        label: i18n.translate(
          'xpack.apm.transactionActionMenu.showContainerMetricsLinkLabel',
          { defaultMessage: 'Show container metrics' }
        ),
        target: containerId,
        hash: `/link-to/container-detail/${containerId}`,
        query: infraMetricsQuery
      },

      {
        icon: 'infraApp',
        label: i18n.translate(
          'xpack.apm.transactionActionMenu.showHostMetricsLinkLabel',
          { defaultMessage: 'Show host metrics' }
        ),
        target: hostName,
        hash: `/link-to/host-detail/${hostName}`,
        query: infraMetricsQuery
      }
    ]
      .filter(({ target }) => Boolean(target))
      .map(({ icon, label, hash, query }, index) => {
        const href = getKibanaHref({
          location,
          pathname,
          hash,
          query: query as StringMap // TODO: differentiate between APM ui query args, and external query args
        });

        return (
          <EuiContextMenuItem icon={icon} href={href} key={index}>
            <EuiFlexGroup gutterSize="s">
              <EuiFlexItem>
                <EuiLink>{label}</EuiLink>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiIcon type="popout" />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiContextMenuItem>
        );
      });
  }

  public render() {
    const { transaction, location } = this.props;
    return (
      <QueryWithIndexPattern query={getDiscoverQuery(transaction)}>
        {query => {
          const discoverTransactionHref = getKibanaHref({
            location,
            pathname: '/app/kibana',
            hash: '/discover',
            query
          });

          const items = [
            ...this.getInfraActions(),
            <EuiContextMenuItem
              icon="discoverApp"
              href={discoverTransactionHref}
              key="discover-transaction"
            >
              <EuiFlexGroup gutterSize="s">
                <EuiFlexItem>
                  <EuiLink>
                    {i18n.translate(
                      'xpack.apm.transactionActionMenu.viewSampleDocumentLinkLabel',
                      {
                        defaultMessage: 'View sample document'
                      }
                    )}
                  </EuiLink>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiIcon type="popout" />
                </EuiFlexItem>
              </EuiFlexGroup>
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
              <EuiContextMenuPanel
                items={items}
                title={i18n.translate(
                  'xpack.apm.transactionActionMenu.actionsLabel',
                  { defaultMessage: 'Actions' }
                )}
              />
            </EuiPopover>
          );
        }}
      </QueryWithIndexPattern>
    );
  }
}
