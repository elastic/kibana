/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useEffect, useCallback } from 'react';
import moment from 'moment';
import {
  EuiBasicTable,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonEmpty,
  EuiText,
  EuiBadge,
  EuiPopover,
  EuiContextMenuPanel,
  EuiContextMenuItem,
  EuiHorizontalRule,
  EuiAutoRefreshButton,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { usePluginContext } from '../../hooks/use_plugin_context';
import { useBreadcrumbs } from '../../hooks/use_breadcrumbs';

import { useKibana } from '../../utils/kibana_react';

const DEFAULT_SEARCH_PAGE_SIZE: number = 25;

interface RuleState {
  data: [];
  totalItemsCount: number;
}

interface Pagination {
  index: number;
  size: number;
}

export function RulesPage() {
  const { ObservabilityPageTemplate } = usePluginContext();
  const {
    http,
    docLinks,
    notifications: { toasts },
  } = useKibana().services;

  const [rules, setRules] = useState<RuleState>({ data: [], totalItemsCount: 0 });
  const [page, setPage] = useState<Pagination>({ index: 0, size: DEFAULT_SEARCH_PAGE_SIZE });
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  async function loadObservabilityRules() {
    const { loadRules } = await import('../../../../triggers_actions_ui/public');
    try {
      const response = await loadRules({
        http,
        page: { index: 0, size: DEFAULT_SEARCH_PAGE_SIZE },
        typesFilter: [
          'xpack.uptime.alerts.monitorStatus',
          'xpack.uptime.alerts.tls',
          'xpack.uptime.alerts.tlsCertificate',
          'xpack.uptime.alerts.durationAnomaly',
          'apm.error_rate',
          'apm.transaction_error_rate',
          'apm.transaction_duration',
          'apm.transaction_duration_anomaly',
          'metrics.alert.inventory.threshold',
          'metrics.alert.threshold',
          'logs.alert.document.count',
        ],
      });
      setRules({
        data: response.data as any,
        totalItemsCount: response.total,
      });
    } catch (_e) {
      toasts.addDanger({
        title: i18n.translate('xpack.observability.rules.loadError', {
          defaultMessage: 'Unable to load rules',
        }),
      });
    }
  }

  enum RuleStatus {
    enabled = 'enabled',
    disabled = 'disabled',
  }

  const statuses = Object.values(RuleStatus);
  const togglePopover = useCallback(() => setIsPopoverOpen(!isPopoverOpen), [isPopoverOpen]);
  const popOverButton = (
    <EuiBadge
      iconType="arrowDown"
      iconSide="right"
      onClick={togglePopover}
      onClickAriaLabel="Change status"
    >
      Enabled
    </EuiBadge>
  );

  const panelItems = statuses.map((status) => (
    <EuiContextMenuItem>
      <EuiBadge>{status}</EuiBadge>
    </EuiContextMenuItem>
  ));

  useEffect(() => {
    loadObservabilityRules();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useBreadcrumbs([
    {
      text: i18n.translate('xpack.observability.breadcrumbs.rulesLinkText', {
        defaultMessage: 'Rules',
      }),
    },
  ]);

  const rulesTableColumns = [
    {
      field: 'name',
      name: i18n.translate('xpack.observability.rules.rulesTable.columns.nameTitle', {
        defaultMessage: 'Rule Name',
      }),
    },
    {
      field: 'executionStatus.lastExecutionDate',
      name: i18n.translate('xpack.observability.rules.rulesTable.columns.lastRunTitle', {
        defaultMessage: 'Last run',
      }),
      render: (date: Date) => {
        if (date) {
          return (
            <>
              <EuiFlexGroup direction="column" gutterSize="none">
                <EuiFlexItem grow={false}>
                  <EuiText color="subdued" size="xs">
                    {moment(date).fromNow()}
                  </EuiText>
                </EuiFlexItem>
              </EuiFlexGroup>
            </>
          );
        }
      },
    },
    {
      field: 'executionStatus.status',
      name: i18n.translate('xpack.observability.rules.rulesTable.columns.lastResponseTitle', {
        defaultMessage: 'Last response',
      }),
    },
    {
      field: 'enabled',
      name: i18n.translate('xpack.observability.rules.rulesTable.columns.statusTitle', {
        defaultMessage: 'Status',
      }),
      render: (_enabled: boolean) => {
        return (
          <EuiPopover
            button={popOverButton}
            anchorPosition="downLeft"
            isOpen={isPopoverOpen}
            panelPaddingSize="none"
          >
            <EuiContextMenuPanel items={panelItems} />
          </EuiPopover>
        );
      },
    },
    {
      field: '*',
      name: i18n.translate('xpack.observability.rules.rulesTable.columns.actionsTitle', {
        defaultMessage: 'Actions',
      }),
      actions: [
        {
          name: 'Edit',
          isPrimary: true,
          description: 'Edit this rule',
          icon: 'pencil',
          type: 'icon',
          onClick: () => {},
          'data-test-subj': 'action-edit',
        },
      ],
    },
  ];
  return (
    <ObservabilityPageTemplate
      pageHeader={{
        pageTitle: (
          <>{i18n.translate('xpack.observability.rulesTitle', { defaultMessage: 'Rules' })} </>
        ),
        rightSideItems: [
          <EuiButtonEmpty
            href={docLinks.links.alerting.guide}
            target="_blank"
            iconType="help"
            data-test-subj="documentationLink"
          >
            <FormattedMessage
              id="xpack.observability.rules.docsLinkText"
              defaultMessage="Documentation"
            />
          </EuiButtonEmpty>,
        ],
      }}
    >
      <EuiFlexGroup>
        <EuiFlexItem grow={false}>
          <EuiText size="s" color="subdued" data-test-subj="totalAlertsCount">
            <FormattedMessage
              id="xpack.observability.rules.totalItemsCountDescription"
              defaultMessage="Showing: {pageSize} of {totalItemCount} Rules"
              values={{
                totalItemCount: rules.totalItemsCount,
                pageSize: rules.data.length,
              }}
            />
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiAutoRefreshButton
            isPaused={false}
            refreshInterval={3000}
            onRefreshChange={() => {}}
            shortHand
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiHorizontalRule margin="xs" />
      <EuiFlexGroup direction="column" gutterSize="s">
        <EuiFlexItem>
          <EuiBasicTable
            items={rules.data}
            hasActions={true}
            columns={rulesTableColumns}
            isSelectable={true}
            pagination={{
              pageIndex: page.index,
              pageSize: page.size,
              totalItemCount: rules.totalItemsCount,
            }}
            onChange={({ page: changedPage }: { page: Pagination }) => {
              setPage(changedPage);
            }}
            selection={{
              selectable: () => true,
              onSelectionChange: (selectedItems) => {},
            }}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </ObservabilityPageTemplate>
  );
}
