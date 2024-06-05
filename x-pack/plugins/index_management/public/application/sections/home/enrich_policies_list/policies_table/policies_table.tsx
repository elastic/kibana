/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FunctionComponent } from 'react';
import {
  EuiInMemoryTable,
  EuiBasicTableColumn,
  EuiSearchBarProps,
  EuiButton,
  EuiLink,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { reactRouterNavigate } from '@kbn/kibana-react-plugin/public';
import type { SerializedEnrichPolicy } from '@kbn/index-management';
import { useAppContext } from '../../../../app_context';

export interface Props {
  policies: SerializedEnrichPolicy[];
  onReloadClick: () => void;
  onDeletePolicyClick: (policyName: string) => void;
  onExecutePolicyClick: (policyName: string) => void;
}

const pagination = {
  initialPageSize: 50,
  pageSizeOptions: [25, 50, 100],
};

export const PoliciesTable: FunctionComponent<Props> = ({
  policies,
  onReloadClick,
  onDeletePolicyClick,
  onExecutePolicyClick,
}) => {
  const { history } = useAppContext();

  const renderToolsRight = () => {
    return [
      <EuiButton
        key="reloadPolicies"
        data-test-subj="reloadPoliciesButton"
        iconType="refresh"
        color="success"
        onClick={onReloadClick}
      >
        <FormattedMessage
          id="xpack.idxMgmt.enrichPolicies.table.reloadButton"
          defaultMessage="Reload"
        />
      </EuiButton>,
      <EuiButton
        key="createPolicy"
        fill
        iconType="plusInCircle"
        {...reactRouterNavigate(history, '/enrich_policies/create')}
      >
        <FormattedMessage
          id="xpack.idxMgmt.enrichPolicies.table.createPolicyButton"
          defaultMessage="Create enrich policy"
        />
      </EuiButton>,
    ];
  };

  const search: EuiSearchBarProps = {
    toolsRight: renderToolsRight(),
    box: {
      incremental: true,
    },
  };

  const columns: Array<EuiBasicTableColumn<SerializedEnrichPolicy>> = [
    {
      field: 'name',
      name: i18n.translate('xpack.idxMgmt.enrichPolicies.table.nameField', {
        defaultMessage: 'Name',
      }),
      sortable: true,
      truncateText: true,
      render: (name: string) => (
        <EuiLink
          data-test-subj="enrichPolicyDetailsLink"
          {...reactRouterNavigate(history, {
            pathname: '/enrich_policies',
            search: `policy=${encodeURIComponent(name)}`,
          })}
        >
          {name}
        </EuiLink>
      ),
    },
    {
      field: 'type',
      name: i18n.translate('xpack.idxMgmt.enrichPolicies.table.typeField', {
        defaultMessage: 'Type',
      }),
      sortable: true,
    },
    {
      field: 'sourceIndices',
      name: i18n.translate('xpack.idxMgmt.enrichPolicies.table.sourceIndicesField', {
        defaultMessage: 'Source indices',
      }),
      truncateText: true,
      render: (indices: string[]) => <span className="eui-textTruncate">{indices.join(', ')}</span>,
    },
    {
      field: 'matchField',
      name: i18n.translate('xpack.idxMgmt.enrichPolicies.table.matchFieldField', {
        defaultMessage: 'Match field',
      }),
      truncateText: true,
    },
    {
      field: 'enrichFields',
      name: i18n.translate('xpack.idxMgmt.enrichPolicies.table.enrichFieldsField', {
        defaultMessage: 'Enrich fields',
      }),
      truncateText: true,
      render: (fields: string[]) => <span className="eui-textTruncate">{fields.join(', ')}</span>,
    },
    {
      name: i18n.translate('xpack.idxMgmt.enrichPolicies.table.actionsField', {
        defaultMessage: 'Actions',
      }),
      actions: [
        {
          isPrimary: true,
          name: i18n.translate('xpack.idxMgmt.enrichPolicies.table.executeAction', {
            defaultMessage: 'Execute',
          }),
          description: i18n.translate('xpack.idxMgmt.enrichPolicies.table.executeDescription', {
            defaultMessage: 'Execute this enrich policy',
          }),
          type: 'icon',
          icon: 'play',
          'data-test-subj': 'executePolicyButton',
          onClick: ({ name }) => onExecutePolicyClick(name),
        },
        {
          isPrimary: true,
          name: i18n.translate('xpack.idxMgmt.enrichPolicies.table.deleteAction', {
            defaultMessage: 'Delete',
          }),
          description: i18n.translate('xpack.idxMgmt.enrichPolicies.table.deleteDescription', {
            defaultMessage: 'Delete this enrich policy',
          }),
          type: 'icon',
          icon: 'trash',
          color: 'danger',
          'data-test-subj': 'deletePolicyButton',
          onClick: ({ name }) => onDeletePolicyClick(name),
        },
      ],
    },
  ];

  return (
    <EuiInMemoryTable
      data-test-subj="enrichPoliciesTable"
      items={policies}
      itemId="name"
      columns={columns}
      search={search}
      pagination={pagination}
      sorting={true}
    />
  );
};
