/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState, Fragment } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiInMemoryTable, EuiBasicTableColumn } from '@elastic/eui';
import { TemplateListItem } from '../../../../../../common';
import { TemplateDeleteModal } from '../../../../components';
import { SendRequestResponse } from '../../../../../shared_imports';
import { TemplateContentIndicator } from '../components';

interface Props {
  templates: TemplateListItem[];
  reload: () => Promise<SendRequestResponse>;
}

export const TemplateTable: React.FunctionComponent<Props> = ({ templates, reload }) => {
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
      render: (composedOf = []) => <span>{composedOf.join(', ')}</span>,
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
      field: 'hasMappings',
      name: i18n.translate('xpack.idxMgmt.templateList.table.overridesColumnTitle', {
        defaultMessage: 'Overrides',
      }),
      truncateText: true,
      sortable: false,
      render: (_, item) => (
        <TemplateContentIndicator
          mappings={item.hasMappings}
          settings={item.hasSettings}
          aliases={item.hasAliases}
        />
      ),
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
