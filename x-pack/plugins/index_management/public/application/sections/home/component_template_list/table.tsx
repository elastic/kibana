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
} from '@elastic/eui';

interface ComponentTemplate {
  name: string;
}

export interface Props {
  componentTemplates: ComponentTemplate[];
  onReloadClick: () => void;
  onDeleteClick: (componentTemplateName: string[]) => void;
}

export const ComponentTable: FunctionComponent<Props> = ({
  componentTemplates,
  onReloadClick,
  onDeleteClick,
}) => {
  const [selection, setSelection] = useState<ComponentTemplate[]>([]);

  const tableProps: EuiInMemoryTableProps<ComponentTemplate> = {
    itemId: 'name',
    isSelectable: true,
    'data-test-subj': 'componentTemplatesTable',
    sorting: { sort: { field: 'name', direction: 'asc' } },
    selection: {
      onSelectionChange: setSelection,
    },
    rowProps: () => ({
      'data-test-subj': 'componentTemplateTableRow',
    }),
    cellProps: (componentTemplate, column) => {
      const { field } = column as EuiTableFieldDataColumnType<ComponentTemplate>;

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
        ) : (
          undefined
        ),
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
        <EuiButton
          href="#"
          fill
          iconType="plusInCircle"
          data-test-subj="createComponentTemplateButton"
          key="createComponentTemplateButton"
        >
          {i18n.translate(
            'xpack.idxMgmt.componentTemplatesList.table.createComponentTemplateButtonLabel',
            {
              defaultMessage: 'Create a component template',
            }
          )}
        </EuiButton>,
      ],
      box: {
        incremental: true,
      },
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
          // TODO placeholder for now
          <EuiLink href={'#'} data-test-subj="componentTemplateDetailsLink">
            {name}
          </EuiLink>
        ),
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
            isPrimary: true,
            name: i18n.translate('xpack.idxMgmt.componentTemplatesList.table.editActionLabel', {
              defaultMessage: 'Edit',
            }),
            description: i18n.translate(
              'xpack.idxMgmt.componentTemplatesList.table.editActionDescription',
              {
                defaultMessage: 'Edit this component template',
              }
            ),
            type: 'icon',
            icon: 'pencil',
            // TODO placeholder for now
            onClick: ({ name }) => {},
          },
          {
            name: i18n.translate('xpack.idxMgmt.componentTemplatesList.table.cloneActionLabel', {
              defaultMessage: 'Clone',
            }),
            description: i18n.translate(
              'xpack.idxMgmt.componentTemplatesList.table.cloneActionDescription',
              {
                defaultMessage: 'Clone this component template',
              }
            ),
            type: 'icon',
            icon: 'copy',
            // TODO placeholder for now
            onClick: ({ name }) => {},
          },
          {
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
          },
        ],
      },
    ],
    items: componentTemplates ?? [],
  };

  return <EuiInMemoryTable {...tableProps} />;
};
