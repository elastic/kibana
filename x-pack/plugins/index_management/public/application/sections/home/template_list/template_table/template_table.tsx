/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState, Fragment } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import {
  EuiInMemoryTable,
  EuiBasicTableColumn,
  EuiButton,
  EuiLink,
  EuiBadge,
  EuiIcon,
} from '@elastic/eui';
import { ScopedHistory } from 'kibana/public';

import { TemplateListItem } from '../../../../../../common';
import { UIM_TEMPLATE_SHOW_DETAILS_CLICK } from '../../../../../../common/constants';
import { SendRequestResponse, reactRouterNavigate } from '../../../../../shared_imports';
import { encodePathForReactRouter } from '../../../../services/routing';
import { useServices } from '../../../../app_context';
import { TemplateDeleteModal } from '../../../../components';
import { TemplateContentIndicator } from '../../../../components/shared';

interface Props {
  templates: TemplateListItem[];
  reload: () => Promise<SendRequestResponse>;
  editTemplate: (name: string) => void;
  cloneTemplate: (name: string) => void;
  history: ScopedHistory;
}

export const TemplateTable: React.FunctionComponent<Props> = ({
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
      name: i18n.translate('xpack.idxMgmt.templateList.table.nameColumnTitle', {
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
                },
                () => uiMetricService.trackMetric('click', UIM_TEMPLATE_SHOW_DETAILS_CLICK)
              )}
              data-test-subj="templateDetailsLink"
            >
              {name}
            </EuiLink>
            &nbsp;
            {item._kbnMeta.isManaged ? (
              <EuiBadge color="hollow" data-test-subj="isManagedBadge">
                Managed
              </EuiBadge>
            ) : (
              ''
            )}
          </>
        );
      },
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
      name: i18n.translate('xpack.idxMgmt.templateList.table.dataStreamColumnTitle', {
        defaultMessage: 'Data stream',
      }),
      truncateText: true,
      render: (template: TemplateListItem) =>
        template._kbnMeta.hasDatastream ? <EuiIcon type="check" /> : null,
    },
    {
      name: i18n.translate('xpack.idxMgmt.templateList.table.contentColumnTitle', {
        defaultMessage: 'Content',
      }),
      truncateText: true,
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
          enabled: ({ _kbnMeta: { isCloudManaged } }: TemplateListItem) => !isCloudManaged,
        },
        {
          type: 'icon',
          name: i18n.translate('xpack.idxMgmt.templateList.table.actionCloneTitle', {
            defaultMessage: 'Clone',
          }),
          description: i18n.translate('xpack.idxMgmt.templateList.table.actionCloneDescription', {
            defaultMessage: 'Clone this template',
          }),
          icon: 'copy',
          onClick: ({ name }: TemplateListItem) => {
            cloneTemplate(name);
          },
        },
        {
          name: i18n.translate('xpack.idxMgmt.templateList.table.actionDeleteText', {
            defaultMessage: 'Delete',
          }),
          description: i18n.translate('xpack.idxMgmt.templateList.table.actionDeleteDecription', {
            defaultMessage: 'Delete this template',
          }),
          icon: 'trash',
          color: 'danger',
          type: 'icon',
          onClick: ({ name, _kbnMeta: { isLegacy } }: TemplateListItem) => {
            setTemplatesToDelete([{ name, isLegacy }]);
          },
          isPrimary: true,
          enabled: ({ _kbnMeta: { isCloudManaged } }: TemplateListItem) => !isCloudManaged,
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
    selectable: ({ _kbnMeta: { isCloudManaged } }: TemplateListItem) => !isCloudManaged,
    selectableMessage: (selectable: boolean) => {
      if (!selectable) {
        return i18n.translate(
          'xpack.idxMgmt.templateList.legacyTable.deleteManagedTemplateTooltip',
          {
            defaultMessage: 'You cannot delete a managed template.',
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
            id="xpack.idxMgmt.templateList.table.deleteTemplatesButtonLabel"
            defaultMessage="Delete {count, plural, one {template} other {templates} }"
            values={{ count: selection.length }}
          />
        </EuiButton>
      ) : undefined,
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
