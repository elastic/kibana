/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState, Fragment } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiInMemoryTable, EuiBasicTableColumn, EuiButton } from '@elastic/eui';
import { ScopedHistory } from 'kibana/public';

import { TemplateListItem } from '../../../../../../common';
import { TemplateDeleteModal } from '../../../../components';
import { SendRequestResponse, reactRouterNavigate } from '../../../../../shared_imports';
import { TemplateContentIndicator } from '../../../../components/shared';

interface Props {
  templates: TemplateListItem[];
  reload: () => Promise<SendRequestResponse>;
  editTemplate: (name: string) => void;
  history: ScopedHistory;
}

export const TemplateTable: React.FunctionComponent<Props> = ({
  templates,
  reload,
  history,
  editTemplate,
}) => {
  const [templatesToDelete, setTemplatesToDelete] = useState<
    Array<{ name: string; isLegacy?: boolean }>
  >([]);

  const columns: Array<EuiBasicTableColumn<TemplateListItem>> = [
    {
      field: 'name',
      name: i18n.translate('xpack.idxMgmt.templateList.table.nameColumnTitle', {
        defaultMessage: 'Name',
      }),
      truncateText: true,
      sortable: true,
    },
    {
      field: 'indexPatterns',
      name: i18n.translate('xpack.idxMgmt.templateList.table.indexPatternsColumnTitle', {
        defaultMessage: 'Index patterns',
      }),
      truncateText: true,
      sortable: true,
      render: (indexPatterns: string[]) => <strong>{indexPatterns.join(', ')}</strong>,
    },
    {
      field: 'ilmPolicy',
      name: i18n.translate('xpack.idxMgmt.templateList.table.ilmPolicyColumnTitle', {
        defaultMessage: 'ILM policy',
      }),
      truncateText: true,
      sortable: true,
      render: (ilmPolicy: { name: string }) =>
        ilmPolicy && ilmPolicy.name ? (
          <span
            title={i18n.translate('xpack.idxMgmt.templateList.table.ilmPolicyColumnDescription', {
              defaultMessage: "'{policyName}' index lifecycle policy",
              values: {
                policyName: ilmPolicy.name,
              },
            })}
          >
            {ilmPolicy.name}
          </span>
        ) : null,
    },
    {
      field: 'composedOf',
      name: i18n.translate('xpack.idxMgmt.templateList.table.componentsColumnTitle', {
        defaultMessage: 'Components',
      }),
      truncateText: true,
      sortable: true,
      render: (composedOf: string[] = []) => <span>{composedOf.join(', ')}</span>,
    },
    {
      field: 'priority',
      name: i18n.translate('xpack.idxMgmt.templateList.table.priorityColumnTitle', {
        defaultMessage: 'Priority',
      }),
      truncateText: true,
      sortable: true,
    },
    {
      name: i18n.translate('xpack.idxMgmt.templateList.table.overridesColumnTitle', {
        defaultMessage: 'Overrides',
      }),
      truncateText: true,
      render: (item: TemplateListItem) => (
        <TemplateContentIndicator
          mappings={item.hasMappings}
          settings={item.hasSettings}
          aliases={item.hasAliases}
        />
      ),
    },
    {
      name: i18n.translate('xpack.idxMgmt.templateList.table.actionColumnTitle', {
        defaultMessage: 'Actions',
      }),
      actions: [
        {
          name: i18n.translate('xpack.idxMgmt.templateList.table.actionEditText', {
            defaultMessage: 'Edit',
          }),
          isPrimary: true,
          description: i18n.translate('xpack.idxMgmt.templateList.table.actionEditDecription', {
            defaultMessage: 'Edit this template',
          }),
          icon: 'pencil',
          type: 'icon',
          onClick: ({ name }: TemplateListItem) => {
            editTemplate(name);
          },
          enabled: ({ _kbnMeta: { isManaged } }: TemplateListItem) => !isManaged,
        },
      ],
    },
  ];

  const pagination = {
    initialPageSize: 20,
    pageSizeOptions: [10, 20, 50],
  };

  const sorting = {
    sort: {
      field: 'name',
      direction: 'asc',
    },
  } as const;

  const searchConfig = {
    box: {
      incremental: true,
    },
    toolsRight: [
      <EuiButton
        iconType="plusInCircle"
        data-test-subj="createTemplateButton"
        key="createTemplateButton"
        fill
        {...reactRouterNavigate(history, '/create_template')}
      >
        <FormattedMessage
          id="xpack.idxMgmt.templateList.table.createTemplatesButtonLabel"
          defaultMessage="Create template"
        />
      </EuiButton>,
    ],
  };

  return (
    <Fragment>
      {templatesToDelete && templatesToDelete.length > 0 ? (
        <TemplateDeleteModal
          callback={(data) => {
            if (data && data.hasDeletedTemplates) {
              reload();
            } else {
              setTemplatesToDelete([]);
            }
          }}
          templatesToDelete={templatesToDelete}
        />
      ) : null}
      <EuiInMemoryTable
        items={templates || []}
        itemId="name"
        columns={columns}
        search={searchConfig}
        sorting={sorting}
        isSelectable={false}
        pagination={pagination}
        rowProps={() => ({
          'data-test-subj': 'row',
        })}
        cellProps={() => ({
          'data-test-subj': 'cell',
        })}
        data-test-subj="templateTable"
        message={
          <FormattedMessage
            id="xpack.idxMgmt.templateList.table.noIndexTemplatesMessage"
            defaultMessage="No index templates found"
          />
        }
      />
    </Fragment>
  );
};
