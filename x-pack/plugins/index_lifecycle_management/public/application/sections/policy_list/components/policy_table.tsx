/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButtonEmpty, EuiLink, EuiInMemoryTable, EuiToolTip, EuiButtonIcon } from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import moment from 'moment';
import { METRIC_TYPE } from '@kbn/analytics';
import { useHistory } from 'react-router-dom';
import { EuiBasicTableColumn } from '@elastic/eui/src/components/basic_table/basic_table';
import { reactRouterNavigate } from '../../../../../../../../src/plugins/kibana_react/public';
import { PolicyFromES } from '../../../../../common/types';
import { useKibana } from '../../../../shared_imports';
import { getIndicesListPath, getPolicyEditPath } from '../../../services/navigation';
import { trackUiMetric } from '../../../services/ui_metric';

import { UIM_EDIT_CLICK } from '../../../constants';
import { hasLinkedIndices } from '../../../lib/policies';
import { usePolicyListContext } from '../policy_list_context';

const actionTooltips = {
  deleteEnabled: i18n.translate('xpack.indexLifecycleMgmt.policyTable.deletePolicyButtonText', {
    defaultMessage: 'Delete policy',
  }),
  deleteDisabled: i18n.translate(
    'xpack.indexLifecycleMgmt.policyTable.deletePolicyButtonDisabledTooltip',
    {
      defaultMessage: 'You cannot delete a policy that is being used by an index',
    }
  ),
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

export const PolicyTable: React.FunctionComponent<Props> = ({ policies }) => {
  const history = useHistory();
  const {
    services: { getUrlForApp },
  } = useKibana();

  const { setListAction } = usePolicyListContext();

  const columns: Array<EuiBasicTableColumn<PolicyFromES>> = [
    {
      'data-test-subj': 'policy-name',
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
      'data-test-subj': 'policy-indexTemplates',
      field: 'indexTemplates',
      name: i18n.translate('xpack.indexLifecycleMgmt.policyTable.headers.indexTemplatesHeader', {
        defaultMessage: 'Linked index templates',
      }),
      sortable: ({ indexTemplates }) => (indexTemplates ?? []).length,
      render: (value: string[], policy: PolicyFromES) => {
        return value && value.length > 0 ? (
          <EuiToolTip content={actionTooltips.viewIndices} position="left">
            <EuiButtonEmpty
              flush="both"
              data-test-subj="viewIndexTemplates"
              onClick={() =>
                setListAction({ selectedPolicy: policy, actionType: 'viewIndexTemplates' })
              }
            >
              {value.length}
            </EuiButtonEmpty>
          </EuiToolTip>
        ) : (
          '0'
        );
      },
    },
    {
      'data-test-subj': 'policy-indices',
      field: 'indices',
      name: i18n.translate('xpack.indexLifecycleMgmt.policyTable.headers.linkedIndicesHeader', {
        defaultMessage: 'Linked indices',
      }),
      sortable: ({ indices }) => (indices ?? []).length,
      render: (value: string[], policy: PolicyFromES) => {
        return value && value.length > 0 ? (
          <EuiToolTip content={actionTooltips.viewIndices} position="left">
            <EuiLink href={getIndicesListPath(policy.name, getUrlForApp)}>{value.length}</EuiLink>
          </EuiToolTip>
        ) : (
          '0'
        );
      },
    },
    {
      'data-test-subj': 'policy-modifiedDate',
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
          render: (policy: PolicyFromES) => {
            return (
              <EuiToolTip content={actionTooltips.addIndexTemplate}>
                <EuiButtonIcon
                  data-test-subj="addPolicyToTemplate"
                  onClick={() =>
                    setListAction({ selectedPolicy: policy, actionType: 'addIndexTemplate' })
                  }
                  iconType="plusInCircle"
                  aria-label={actionTooltips.addIndexTemplate}
                />
              </EuiToolTip>
            );
          },
        },
        {
          render: (policy: PolicyFromES, enabled: boolean) => {
            return (
              <EuiToolTip
                content={enabled ? actionTooltips.deleteEnabled : actionTooltips.deleteDisabled}
              >
                <EuiButtonIcon
                  data-test-subj="deletePolicy"
                  onClick={() =>
                    setListAction({ selectedPolicy: policy, actionType: 'deletePolicy' })
                  }
                  iconType="trash"
                  aria-label={actionTooltips.deleteEnabled}
                  disabled={!enabled}
                />
              </EuiToolTip>
            );
          },
          enabled: (policy: PolicyFromES) => !hasLinkedIndices(policy),
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
      search={{
        box: { incremental: true, 'data-test-subj': 'ilmSearchBar' },
      }}
      tableLayout="auto"
      items={policies}
      columns={columns}
      rowProps={(policy: PolicyFromES) => ({ 'data-test-subj': `policyTableRow-${policy.name}` })}
    />
  );
};
