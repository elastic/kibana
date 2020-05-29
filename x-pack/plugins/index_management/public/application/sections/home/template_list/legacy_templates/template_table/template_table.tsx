/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState, Fragment } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiInMemoryTable, EuiIcon, EuiButton, EuiLink, EuiBasicTableColumn } from '@elastic/eui';
import { TemplateListItem } from '../../../../../../../common';
import { BASE_PATH, UIM_TEMPLATE_SHOW_DETAILS_CLICK } from '../../../../../../../common/constants';
import { TemplateDeleteModal } from '../../../../../components';
import { useServices } from '../../../../../app_context';
import { getTemplateDetailsLink } from '../../../../../services/routing';
import { SendRequestResponse } from '../../../../../../shared_imports';

interface Props {
  templates: TemplateListItem[];
  reload: () => Promise<SendRequestResponse>;
  editTemplate: (name: string, isLegacy?: boolean) => void;
  cloneTemplate: (name: string, isLegacy?: boolean) => void;
}

export const LegacyTemplateTable: React.FunctionComponent<Props> = ({
  templates,
  reload,
  editTemplate,
  cloneTemplate,
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
          /* eslint-disable-next-line @elastic/eui/href-or-on-click */
          <EuiLink
            href={getTemplateDetailsLink(name, item._kbnMeta.isLegacy, true)}
            data-test-subj="templateDetailsLink"
            onClick={() => uiMetricService.trackMetric('click', UIM_TEMPLATE_SHOW_DETAILS_CLICK)}
          >
            {name}
          </EuiLink>
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
      field: 'order',
      name: i18n.translate('xpack.idxMgmt.templateList.legacyTable.orderColumnTitle', {
        defaultMessage: 'Order',
      }),
      truncateText: true,
      sortable: true,
    },
    {
      field: 'hasMappings',
      name: i18n.translate('xpack.idxMgmt.templateList.legacyTable.mappingsColumnTitle', {
        defaultMessage: 'Mappings',
      }),
      truncateText: true,
      sortable: true,
      render: (hasMappings: boolean) => (hasMappings ? <EuiIcon type="check" /> : null),
    },
    {
      field: 'hasSettings',
      name: i18n.translate('xpack.idxMgmt.templateList.legacyTable.settingsColumnTitle', {
        defaultMessage: 'Settings',
      }),
      truncateText: true,
      sortable: true,
      render: (hasSettings: boolean) => (hasSettings ? <EuiIcon type="check" /> : null),
    },
    {
      field: 'hasAliases',
      name: i18n.translate('xpack.idxMgmt.templateList.legacyTable.aliasesColumnTitle', {
        defaultMessage: 'Aliases',
      }),
      truncateText: true,
      sortable: true,
      render: (hasAliases: boolean) => (hasAliases ? <EuiIcon type="check" /> : null),
    },
    {
      name: i18n.translate('xpack.idxMgmt.templateList.legacyTable.actionColumnTitle', {
        defaultMessage: 'Actions',
      }),
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
          onClick: ({ name, _kbnMeta: { isLegacy } }: TemplateListItem) => {
            editTemplate(name, isLegacy);
          },
          enabled: ({ _kbnMeta: { isManaged } }: TemplateListItem) => !isManaged,
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
          onClick: ({ name, _kbnMeta: { isLegacy } }: TemplateListItem) => {
            cloneTemplate(name, isLegacy);
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

  const selectionConfig = {
    onSelectionChange: setSelection,
    selectable: ({ _kbnMeta: { isManaged } }: TemplateListItem) => !isManaged,
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
            id="xpack.idxMgmt.templateList.legacyTable.deleteTemplatesButtonLabel"
            defaultMessage="Delete {count, plural, one {template} other {templates} }"
            values={{ count: selection.length }}
          />
        </EuiButton>
      ) : undefined,
    toolsRight: [
      <EuiButton
        href={`#${BASE_PATH}create_template`}
        iconType="plusInCircle"
        data-test-subj="createLegacyTemplateButton"
        key="createTemplateButton"
      >
        <FormattedMessage
          id="xpack.idxMgmt.templateList.legacyTable.createLegacyTemplatesButtonLabel"
          defaultMessage="Create legacy template"
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
