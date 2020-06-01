/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { FunctionComponent, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import {
  EuiInMemoryTable,
  EuiLink,
  EuiButton,
  EuiInMemoryTableProps,
  EuiTableFieldDataColumnType,
  EuiHealth,
  EuiIcon,
} from '@elastic/eui';

import { ComponentTemplateListItem } from '../types';
import { useComponentTemplatesContext } from '../component_templates_context';

export interface Props {
  componentTemplates: ComponentTemplateListItem[];
  onReloadClick: () => void;
  onDeleteClick: (componentTemplateName: string[]) => void;
}

export const ComponentTable: FunctionComponent<Props> = ({
  componentTemplates,
  onReloadClick,
  onDeleteClick,
}) => {
  const [selection, setSelection] = useState<ComponentTemplateListItem[]>([]);

  const { appBasePath } = useComponentTemplatesContext();

  const tableProps: EuiInMemoryTableProps<ComponentTemplateListItem> = {
    itemId: 'name',
    isSelectable: true,
    'data-test-subj': 'componentTemplatesTable',
    sorting: { sort: { field: 'name', direction: 'asc' } },
    selection: {
      onSelectionChange: setSelection,
      selectable: ({ isInUse }) => !isInUse,
      selectableMessage: (selectable) =>
        !selectable
          ? i18n.translate('xpack.idxMgmt.componentTemplatesList.table.disabledSelectionLabel', {
              defaultMessage: 'Component template is in use and cannot be deleted',
            })
          : i18n.translate('xpack.idxMgmt.componentTemplatesList.table.selectionLabel', {
              defaultMessage: 'Select this component template',
            }),
    },
    rowProps: () => ({
      'data-test-subj': 'componentTemplateTableRow',
    }),
    cellProps: (componentTemplate, column) => {
      const { field } = column as EuiTableFieldDataColumnType<ComponentTemplateListItem>;

      return {
        'data-test-subj': `componentTemplateTableRow-${field}`,
      };
    },
    search: {
      toolsLeft:
        selection.length > 0 ? (
          <EuiButton
            data-test-subj="deleteComponentTemplatexButton"
            onClick={() => onDeleteClick(selection.map(({ name }) => name))}
            color="danger"
          >
            <FormattedMessage
              id="xpack.idxMgmt.componentTemplatesList.table.deleteComponentTemplatesButtonLabel"
              defaultMessage="Delete {count, plural, one {component template} other {component templates} }"
              values={{ count: selection.length }}
            />
          </EuiButton>
        ) : undefined,
      toolsRight: [
        <EuiButton
          key="reloadButton"
          iconType="refresh"
          color="secondary"
          data-test-subj="reloadButton"
          onClick={onReloadClick}
        >
          {i18n.translate('xpack.idxMgmt.componentTemplatesList.table.reloadButtonLabel', {
            defaultMessage: 'Reload',
          })}
        </EuiButton>,
      ],
      box: {
        incremental: true,
      },
      filters: [
        {
          type: 'field_value_selection' as const,
          field: 'isInUse',
          name: i18n.translate('xpack.idxMgmt.componentTemplatesList.table.isInUseFilterLabel', {
            defaultMessage: 'Status',
          }),
          multiSelect: false,
          options: [
            {
              value: true,
              view: i18n.translate(
                'xpack.idxMgmt.componentTemplatesList.table.inUseFilterOptionLabel',
                {
                  defaultMessage: 'In use',
                }
              ),
            },
            {
              value: false,
              view: i18n.translate(
                'xpack.idxMgmt.componentTemplatesList.table.notInUseFilterOptionLabel',
                {
                  defaultMessage: 'Not in use',
                }
              ),
            },
          ],
        },
      ],
    },
    pagination: {
      initialPageSize: 10,
      pageSizeOptions: [10, 20, 50],
    },
    columns: [
      {
        field: 'name',
        name: i18n.translate('xpack.idxMgmt.componentTemplatesList.table.nameColumnTitle', {
          defaultMessage: 'Name',
        }),
        sortable: true,
        render: (name: string) => (
          <EuiLink
            href={`#${appBasePath}component_templates/${name}`}
            data-test-subj="componentTemplateDetailsLink"
          >
            {name}
          </EuiLink>
        ),
      },
      {
        field: 'isInUse',
        name: i18n.translate('xpack.idxMgmt.componentTemplatesList.table.isInUseColumnTitle', {
          defaultMessage: 'Status',
        }),
        sortable: true,
        render: (isInUse: boolean) => {
          const label = isInUse
            ? i18n.translate('xpack.idxMgmt.componentTemplatesList.table.inUseCellDescription', {
                defaultMessage: 'In use',
              })
            : i18n.translate('xpack.idxMgmt.componentTemplatesList.table.notInUseCellDescription', {
                defaultMessage: 'Not in use',
              });
          const color = isInUse ? 'success' : 'danger';
          return <EuiHealth color={color}>{label}</EuiHealth>;
        },
      },
      {
        field: 'hasMappings',
        name: i18n.translate('xpack.idxMgmt.componentTemplatesList.table.mappingsColumnTitle', {
          defaultMessage: 'Mappings',
        }),
        truncateText: true,
        sortable: true,
        render: (hasMappings: boolean) => (hasMappings ? <EuiIcon type="check" /> : null),
      },
      {
        field: 'hasSettings',
        name: i18n.translate('xpack.idxMgmt.componentTemplatesList.table.settingsColumnTitle', {
          defaultMessage: 'Settings',
        }),
        truncateText: true,
        sortable: true,
        render: (hasSettings: boolean) => (hasSettings ? <EuiIcon type="check" /> : null),
      },
      {
        field: 'hasAliases',
        name: i18n.translate('xpack.idxMgmt.componentTemplatesList.table.aliasesColumnTitle', {
          defaultMessage: 'Aliases',
        }),
        truncateText: true,
        sortable: true,
        render: (hasAliases: boolean) => (hasAliases ? <EuiIcon type="check" /> : null),
      },
      {
        name: (
          <FormattedMessage
            id="xpack.idxMgmt.componentTemplatesList.table.actionColumnTitle"
            defaultMessage="Actions"
          />
        ),
        actions: [
          {
            'data-test-subj': 'deleteComponentTemplateButton',
            isPrimary: true,
            name: i18n.translate('xpack.idxMgmt.componentTemplatesList.table.deleteActionLabel', {
              defaultMessage: 'Delete',
            }),
            description: i18n.translate(
              'xpack.idxMgmt.componentTemplatesList.table.deleteActionDescription',
              { defaultMessage: 'Delete this component template' }
            ),
            type: 'icon',
            icon: 'trash',
            color: 'danger',
            onClick: ({ name }) => onDeleteClick([name]),
            enabled: ({ isInUse }) => !isInUse,
          },
        ],
      },
    ],
    items: componentTemplates ?? [],
  };

  return <EuiInMemoryTable {...tableProps} />;
};
