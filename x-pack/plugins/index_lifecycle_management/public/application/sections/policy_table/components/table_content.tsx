/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButtonEmpty, EuiLink, EuiInMemoryTable } from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import moment from 'moment';
import { METRIC_TYPE } from '@kbn/analytics';
import { useHistory } from 'react-router-dom';
import { EuiBasicTableColumn } from '@elastic/eui/src/components/basic_table/basic_table';
import { reactRouterNavigate } from '../../../../../../../../src/plugins/kibana_react/public';
import { getIndexListUri } from '../../../../../../index_management/public';
import { PolicyFromES } from '../../../../../common/types';
import { useKibana } from '../../../../shared_imports';
import { getPolicyEditPath } from '../../../services/navigation';
import { trackUiMetric } from '../../../services/ui_metric';

import { UIM_EDIT_CLICK } from '../../../constants';
import { usePolicyListContext } from '../policy_list_context';
import { hasLinkedIndices } from '../../../lib/policies';

const actionLabels = {
  delete: i18n.translate('xpack.indexLifecycleMgmt.policyTable.deletePolicyButtonText', {
    defaultMessage: 'Delete policy',
  }),
  viewIndices: i18n.translate('xpack.indexLifecycleMgmt.policyTable.viewIndicesButtonText', {
    defaultMessage: 'View indices linked to policy',
  }),
  addIndexTemplate: i18n.translate(
    'xpack.indexLifecycleMgmt.policyTable.addPolicyToTemplateButtonText',
    {
      defaultMessage: 'Add policy to index template',
    }
  ),
};

interface Props {
  policies: PolicyFromES[];
}

export const TableContent: React.FunctionComponent<Props> = ({ policies }) => {
  const history = useHistory();
  const {
    services: { navigateToApp },
  } = useKibana();

  const { setPolicyAction } = usePolicyListContext();

  const columns: Array<EuiBasicTableColumn<PolicyFromES>> = [
    {
      field: 'name',
      name: i18n.translate('xpack.indexLifecycleMgmt.policyTable.headers.nameHeader', {
        defaultMessage: 'Name',
      }),
      sortable: true,
      render: (value: string) => {
        return (
          <EuiLink
            className="eui-textBreakAll"
            data-test-subj="policyTablePolicyNameLink"
            {...reactRouterNavigate(history, getPolicyEditPath(value), () =>
              trackUiMetric(METRIC_TYPE.CLICK, UIM_EDIT_CLICK)
            )}
          >
            {value}
          </EuiLink>
        );
      },
    },
    {
      field: 'indexTemplates',
      name: i18n.translate('xpack.indexLifecycleMgmt.policyTable.headers.indexTemplatesHeader', {
        defaultMessage: 'Linked index templates',
      }),
      sortable: ({ indexTemplates }) => (indexTemplates ?? []).length,
      render: (value: string[], policy: PolicyFromES) => {
        return value && value.length > 0 ? (
          <EuiButtonEmpty
            flush="left"
            data-test-subj="viewIndexTemplates"
            onClick={() => setPolicyAction({ policy, action: 'viewIndexTemplates' })}
          >
            {value.length}
          </EuiButtonEmpty>
        ) : (
          '0'
        );
      },
    },
    {
      field: 'indices',
      name: i18n.translate('xpack.indexLifecycleMgmt.policyTable.headers.linkedIndicesHeader', {
        defaultMessage: 'Linked indices',
      }),
      sortable: ({ indices }) => (indices ?? []).length,
      render: (value: string[]) => {
        return value ? value.length : '0';
      },
    },
    {
      field: 'modifiedDate',
      name: i18n.translate('xpack.indexLifecycleMgmt.policyTable.headers.modifiedDateHeader', {
        defaultMessage: 'Modified date',
      }),
      sortable: true,
      render: (value: string) => {
        return value ? moment(value).format('MMM D, YYYY') : value;
      },
    },
    {
      actions: [
        {
          name: actionLabels.viewIndices,
          description: actionLabels.viewIndices,
          enabled: hasLinkedIndices,
          type: 'icon',
          icon: 'list',
          onClick: (policy: PolicyFromES) =>
            navigateToApp('management', {
              path: `/data/index_management${getIndexListUri(`ilm.policy:"${policy.name}"`, true)}`,
            }),
        },
        {
          name: actionLabels.addIndexTemplate,
          description: actionLabels.addIndexTemplate,
          type: 'icon',
          icon: 'plusInCircle',
          onClick: (policy: PolicyFromES) =>
            setPolicyAction({ policy, action: 'addIndexTemplate' }),
          'data-test-subj': 'addPolicyToTemplate',
        },
        {
          name: actionLabels.delete,
          description: actionLabels.delete,
          type: 'icon',
          icon: 'trash',
          enabled: (policy: PolicyFromES) => !hasLinkedIndices(policy),
          onClick: (policy: PolicyFromES) => setPolicyAction({ policy, action: 'deletePolicy' }),
          'data-test-subj': 'deletePolicy',
        },
      ],
      name: i18n.translate('xpack.indexLifecycleMgmt.policyTable.headers.actionsHeader', {
        defaultMessage: 'Actions',
      }),
    },
  ];

  return (
    <EuiInMemoryTable
      tableCaption={i18n.translate('xpack.indexLifecycleMgmt.policyTable.captionText', {
        defaultMessage:
          'The table below contains {count, plural, one {# Index Lifecycle policy} other {# Index Lifecycle policies}} .',
        values: { count: policies.length },
      })}
      pagination={true}
      sorting={{
        sort: {
          field: 'name',
          direction: 'asc',
        },
      }}
      search={{ box: { incremental: true } }}
      tableLayout="auto"
      items={policies}
      columns={columns}
      rowProps={(policy: PolicyFromES) => ({ 'data-test-subj': `policyTableRow-${policy.name}` })}
    />
  );
};
