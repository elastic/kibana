/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState, Fragment } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiInMemoryTable, EuiButton, EuiLink, EuiBasicTableColumn } from '@elastic/eui';
import { ScopedHistory } from 'kibana/public';
import { SendRequestResponse, reactRouterNavigate } from '../../../../../../shared_imports';
import { TemplateListItem } from '../../../../../../../common';
import { UIM_TEMPLATE_SHOW_DETAILS_CLICK } from '../../../../../../../common/constants';
import { TemplateDeleteModal } from '../../../../../components';
import { encodePathForReactRouter } from '../../../../../services/routing';
import { useServices } from '../../../../../app_context';
import { TemplateContentIndicator } from '../../../../../components/shared';
import { TemplateTypeIndicator } from '../../components';

interface Props {
  templates: TemplateListItem[];
  reload: () => Promise<SendRequestResponse>;
  editTemplate: (name: string, isLegacy?: boolean) => void;
  cloneTemplate: (name: string, isLegacy?: boolean) => void;
  history: ScopedHistory;
}

export const LegacyTemplateTable: React.FunctionComponent<Props> = ({
  templates,
  reload,
  editTemplate,
  cloneTemplate,
  history,
}) => {
  const { uiMetricService } = useServices();
  const [selection, setSelection] = useState<TemplateListItem[]>([]);
  const [templatesToDelete, setTemplatesToDelete] = useState<
    Array<{ name: string; isLegacy?: boolean }>
  >([]);

  const columns: Array<EuiBasicTableColumn<TemplateListItem>> = [
    {
      field: 'name',
      name: i18n.translate('xpack.idxMgmt.templateList.legacyTable.nameColumnTitle', {
        defaultMessage: 'Name',
      }),
      truncateText: true,
      sortable: true,
      render: (name: TemplateListItem['name'], item: TemplateListItem) => {
        return (
          <>
            <EuiLink
              {...reactRouterNavigate(
                history,
                {
                  pathname: `/templates/${encodePathForReactRouter(name)}`,
                  search: `legacy=${Boolean(item._kbnMeta.isLegacy)}`,
                },
                () => uiMetricService.trackMetric('click', UIM_TEMPLATE_SHOW_DETAILS_CLICK)
              )}
              data-test-subj="templateDetailsLink"
            >
              {name}
            </EuiLink>
            &nbsp;
            <TemplateTypeIndicator templateType={item._kbnMeta.type} />
          </>
        );
      },
    },
    {
      field: 'indexPatterns',
      name: i18n.translate('xpack.idxMgmt.templateList.legacyTable.indexPatternsColumnTitle', {
        defaultMessage: 'Index patterns',
      }),
      truncateText: true,
      sortable: true,
      render: (indexPatterns: string[]) => <strong>{indexPatterns.join(', ')}</strong>,
    },
    {
      field: 'ilmPolicy',
      name: i18n.translate('xpack.idxMgmt.templateList.legacyTable.ilmPolicyColumnTitle', {
        defaultMessage: 'ILM policy',
      }),
      truncateText: true,
      sortable: true,
      render: (ilmPolicy: { name: string }) =>
        ilmPolicy && ilmPolicy.name ? (
          <span
            title={i18n.translate(
              'xpack.idxMgmt.templateList.legacyTable.ilmPolicyColumnDescription',
              {
                defaultMessage: "'{policyName}' index lifecycle policy",
                values: {
                  policyName: ilmPolicy.name,
                },
              }
            )}
          >
            {ilmPolicy.name}
          </span>
        ) : null,
    },
    {
      name: i18n.translate('xpack.idxMgmt.templateList.legacyTable.contentColumnTitle', {
        defaultMessage: 'Content',
      }),
      width: '120px',
      render: (item: TemplateListItem) => (
        <TemplateContentIndicator
          mappings={item.hasMappings}
          settings={item.hasSettings}
          aliases={item.hasAliases}
          contentWhenEmpty={
            <em>
              {i18n.translate('xpack.idxMgmt.templateList.table.noneDescriptionText', {
                defaultMessage: 'None',
              })}
            </em>
          }
        />
      ),
    },
    {
      name: i18n.translate('xpack.idxMgmt.templateList.legacyTable.actionColumnTitle', {
        defaultMessage: 'Actions',
      }),
      width: '120px',
      actions: [
        {
          name: i18n.translate('xpack.idxMgmt.templateList.legacyTable.actionEditText', {
            defaultMessage: 'Edit',
          }),
          isPrimary: true,
          description: i18n.translate(
            'xpack.idxMgmt.templateList.legacyTable.actionEditDecription',
            {
              defaultMessage: 'Edit this template',
            }
          ),
          icon: 'pencil',
          type: 'icon',
          onClick: ({ name }: TemplateListItem) => {
            editTemplate(name, true);
          },
          enabled: ({ _kbnMeta: { type } }: TemplateListItem) => type !== 'cloudManaged',
        },
        {
          type: 'icon',
          name: i18n.translate('xpack.idxMgmt.templateList.legacyTable.actionCloneTitle', {
            defaultMessage: 'Clone',
          }),
          description: i18n.translate(
            'xpack.idxMgmt.templateList.legacyTable.actionCloneDescription',
            {
              defaultMessage: 'Clone this template',
            }
          ),
          icon: 'copy',
          onClick: ({ name }: TemplateListItem) => {
            cloneTemplate(name, true);
          },
        },
        {
          name: i18n.translate('xpack.idxMgmt.templateList.legacyTable.actionDeleteText', {
            defaultMessage: 'Delete',
          }),
          description: i18n.translate(
            'xpack.idxMgmt.templateList.legacyTable.actionDeleteDecription',
            {
              defaultMessage: 'Delete this template',
            }
          ),
          icon: 'trash',
          color: 'danger',
          type: 'icon',
          onClick: ({ name, _kbnMeta: { isLegacy } }: TemplateListItem) => {
            setTemplatesToDelete([{ name, isLegacy }]);
          },
          isPrimary: true,
          enabled: ({ _kbnMeta: { type } }: TemplateListItem) => type !== 'cloudManaged',
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

  const selectionConfig = {
    onSelectionChange: setSelection,
    selectable: ({ _kbnMeta: { type } }: TemplateListItem) => type !== 'cloudManaged',
    selectableMessage: (selectable: boolean) => {
      if (!selectable) {
        return i18n.translate(
          'xpack.idxMgmt.templateList.legacyTable.deleteCloudManagedTemplateTooltip',
          {
            defaultMessage: 'You cannot delete a cloud-managed template.',
          }
        );
      }
      return '';
    },
  };

  const searchConfig = {
    box: {
      incremental: true,
    },
    toolsLeft:
      selection.length > 0 ? (
        <EuiButton
          data-test-subj="deleteTemplatesButton"
          onClick={() =>
            setTemplatesToDelete(
              selection.map(({ name, _kbnMeta: { isLegacy } }: TemplateListItem) => ({
                name,
                isLegacy,
              }))
            )
          }
          color="danger"
        >
          <FormattedMessage
            id="xpack.idxMgmt.templateList.legacyTable.deleteTemplatesButtonLabel"
            defaultMessage="Delete {count, plural, one {template} other {templates} }"
            values={{ count: selection.length }}
          />
        </EuiButton>
      ) : undefined,
    toolsRight: [
      <EuiButton
        iconType="plusInCircle"
        data-test-subj="createLegacyTemplateButton"
        key="createTemplateButton"
        {...reactRouterNavigate(history, {
          pathname: '/create_template',
          search: 'legacy=true',
        })}
      >
        <FormattedMessage
          id="xpack.idxMgmt.templateList.legacyTable.createLegacyTemplatesButtonLabel"
          defaultMessage="Create legacy template"
        />
      </EuiButton>,
    ],
  };

  const goToList = () => {
    return history.push('templates');
  };

  return (
    <Fragment>
      {templatesToDelete && templatesToDelete.length > 0 ? (
        <TemplateDeleteModal
          callback={(data) => {
            if (data && data.hasDeletedTemplates) {
              reload();
              // Close the flyout if it is opened
              goToList();
            }
            setTemplatesToDelete([]);
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
        isSelectable={true}
        selection={selectionConfig}
        pagination={pagination}
        rowProps={() => ({
          'data-test-subj': 'row',
        })}
        cellProps={() => ({
          'data-test-subj': 'cell',
        })}
        data-test-subj="legacyTemplateTable"
        message={
          <FormattedMessage
            id="xpack.idxMgmt.templateList.legacyTable.noLegacyIndexTemplatesMessage"
            defaultMessage="No legacy index templates found"
          />
        }
      />
    </Fragment>
  );
};
