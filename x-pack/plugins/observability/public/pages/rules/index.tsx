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
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { usePluginContext } from '../../hooks/use_plugin_context';
import { useKibana } from '../../utils/kibana_react';

import { loadAlerts as loadRules } from '../../../../triggers_actions_ui/public';

interface RuleState {
  data: [];
}
export function RulesPage() {
  const { core, ObservabilityPageTemplate } = usePluginContext();
  const { docLinks } = useKibana().services;
  const {
    http,
    notifications: { toasts },
  } = core;
  const [rules, setRules] = useState<RuleState>({ data: [] });
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  async function loadObservabilityRules() {
    try {
      const response = await loadRules({
        http,
        page: { index: 0, size: 10 },
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
      ]
    },
  ];
  console.log(rules.data, '!!data');
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
      <EuiFlexGroup direction="column" gutterSize="s">
        <EuiFlexItem>
          <EuiBasicTable
            items={rules.data}
            columns={rulesTableColumns}
            isSelectable={true}
            selection={{
              selectable: () => true,
              onSelectionChange: (selectedItems) => {
                console.log(selectedItems, '!!selectd');
                setSelectedIds(selectedItems);
              },
            }}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </ObservabilityPageTemplate>
  );
}
