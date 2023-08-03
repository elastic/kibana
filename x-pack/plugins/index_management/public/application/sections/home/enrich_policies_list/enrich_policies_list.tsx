/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { RouteComponentProps } from 'react-router-dom';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiInMemoryTable,
  EuiBasicTableColumn,
  EuiSearchBarProps,
  EuiButton,
  EuiSpacer,
  EuiText,
  EuiLink,
} from '@elastic/eui';

import { APP_WRAPPER_CLASS, useExecutionContext } from '../../../../shared_imports';
import { useAppContext } from '../../../app_context';

import { useLoadEnrichPolicies } from '../../../services/api';
import { PageLoading, PageError } from '../../../../shared_imports';
import { PoliciesTable } from './policies_table';

type policyType = 'match' | 'geo_match' | 'range' | '';

interface BaseTypes {
  name: string;
  sourceIndices: string[];
  matchField: string;
  enrichFields: string[];
}

interface EnrichPolicy extends BaseTypes {
  type: policyType
};

interface BaseEnrichPolicy {
  config: {
    match?: BaseTypes
    geo_match?: BaseTypes
    range?: BaseTypes
  }
}

const getPolicyType = (policy: BaseEnrichPolicy): policyType => {
  if (policy.config.match) {
    return 'match';
  }

  if (policy.config.geo_match) {
    return 'geo_match';
  }

  if (policy.config.range) {
    return 'range';
  }

  return '';
};

const serializeEnrichmentPolicies = (policies: BaseEnrichPolicy[]) => {
  return policies.map((policy: any) => {
    const policyType = getPolicyType(policy);

    return {
      name: policy.config[policyType].name,
      type: policyType,
      sourceIndices: policy.config[policyType].indices,
      matchField: policy.config[policyType].match_field,
      enrichFields: policy.config[policyType].enrich_fields,
    };
  });
};

const columns: Array<EuiBasicTableColumn<EnrichPolicy>> = [
  {
    field: 'name',
    name: 'Name',
    sortable: true,
    truncateText: true,
  },
  {
    field: 'type',
    name: 'Type',
    sortable: true,
  },
  {
    field: 'sourceIndices',
    name: 'Source indices',
    truncateText: true,
    render: (indices: string[]) => indices.join(', '),
  },
  {
    field: 'matchField',
    name: 'Match field',
    truncateText: true,
  },
  {
    field: 'enrichFields',
    name: 'Enrich fields',
    truncateText: false,
    render: (fields: string[]) => fields.join(', '),
  },
  {
    name: 'Actions',
    actions: [
      {
        isPrimary: true,
        name: 'Execute',
        description: 'Execute this enrich policy',
        type: 'icon',
        icon: 'play',
        onClick: () => {},
      },
      {
        isPrimary: true,
        name: 'Delete',
        description: 'Delete this enrich policy',
        type: 'icon',
        icon: 'trash',
        color: 'danger',
        onClick: () => {},
      },
    ]
  },
];

const pagination = {
  initialPageSize: 5,
  pageSizeOptions: [3, 5, 8],
};

export const EnrichPoliciesList: React.FunctionComponent<RouteComponentProps> = ({ history }) => {
  const {
    core: { executionContext },
  } = useAppContext();

  useExecutionContext(executionContext, {
    type: 'application',
    page: 'indexManagementEnrichPoliciesTab',
  });

  const {
    error,
    isLoading,
    data,
    resendRequest: reload,
  } = useLoadEnrichPolicies();

  console.log('==========');
  console.log({
    error,
    isLoading,
    data,
  });

  if (isLoading) {
    return (
      <PageLoading>
        <FormattedMessage
          id="xpack.idxMgmt.enrichPoliciesList.loadingEnrichPoliciesDescription"
          defaultMessage="Loading enrich policies…"
        />
      </PageLoading>
    );
  }

  if (error) {
    return (
      <PageError
        title={
          <FormattedMessage
            id="xpack.idxMgmt.enrichPoliciesList.loadingEnrichPoliciesErrorMessage"
            defaultMessage="Error loading enrich policies"
          />
        }
        error={error}
      />
    );
  }

  const renderToolsRight = () => {
    return [
      <EuiButton
        key="reloadPolicies"
        iconType="refresh"
        color="success"
        onClick={reload}
      >
        Reload
      </EuiButton>,
      <EuiButton
        key="createPolicy"
        fill
        iconType="plusInCircle"
      >
        Create enrich policy
      </EuiButton>,
    ];
  };

  const search: EuiSearchBarProps = {
    toolsRight: renderToolsRight(),
    box: {
      incremental: true,
    },
  };

  return (
    <div className={`${APP_WRAPPER_CLASS} im-snapshotTestSubject`} data-test-subj="indicesList">
      <EuiText color="subdued">
        <FormattedMessage
          id="xpack.idxMgmt.enrichPoliciesList.enrichPoliciesDescription"
          defaultMessage="Enrich policies allow you to enrich your data by adding context via additional data. {learnMoreLink}"
          values={{
            learnMoreLink: (
              <EuiLink
                href={'/todo'}
                target="_blank"
                external
              >
                Learn more
              </EuiLink>
            ),
          }}
        />
      </EuiText>
      <EuiSpacer size="l" />

      <EuiInMemoryTable
        items={serializeEnrichmentPolicies(data.policies)}
        itemId="name"
        columns={columns}
        search={search}
        pagination={pagination}
        sorting={true}
        isSelectable={false}
      />
    </div>
  );
};
