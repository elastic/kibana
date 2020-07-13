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
  EuiButton,
  EuiInMemoryTableProps,
  EuiTextColor,
  EuiIcon,
  EuiLink,
} from '@elastic/eui';
import { ScopedHistory } from 'kibana/public';

import { reactRouterNavigate } from '../../../../../../../../src/plugins/kibana_react/public';
import { ComponentTemplateListItem } from '../shared_imports';
import { UIM_COMPONENT_TEMPLATE_DETAILS } from '../constants';
import { useComponentTemplatesContext } from '../component_templates_context';

export interface Props {
  componentTemplates: ComponentTemplateListItem[];
  onReloadClick: () => void;
  onDeleteClick: (componentTemplateName: string[]) => void;
  onEditClick: (componentTemplateName: string) => void;
  onCloneClick: (componentTemplateName: string) => void;
  history: ScopedHistory;
}

export const ComponentTable: FunctionComponent<Props> = ({
  componentTemplates,
  onReloadClick,
  onDeleteClick,
  onEditClick,
  onCloneClick,
  history,
}) => {
  const { trackMetric } = useComponentTemplatesContext();

  const [selection, setSelection] = useState<ComponentTemplateListItem[]>([]);

  const tableProps: EuiInMemoryTableProps<ComponentTemplateListItem> = {
    itemId: 'name',
    isSelectable: true,
    'data-test-subj': 'componentTemplatesTable',
    sorting: { sort: { field: 'name', direction: 'asc' } },
    selection: {
      onSelectionChange: setSelection,
      selectable: ({ usedBy }) => usedBy.length === 0,
      selectableMessage: (selectable) =>
        selectable
          ? i18n.translate('xpack.idxMgmt.componentTemplatesList.table.selectionLabel', {
              defaultMessage: 'Select this component template',
            })
          : i18n.translate('xpack.idxMgmt.componentTemplatesList.table.disabledSelectionLabel', {
              defaultMessage: 'Component template is in use and cannot be deleted',
            }),
    },
    rowProps: () => ({
      'data-test-subj': 'componentTemplateTableRow',
    }),
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
        <EuiButton
          fill
          iconType="plusInCircle"
          data-test-subj="createPipelineButton"
          key="createPipelineButton"
          {...reactRouterNavigate(history, '/create_component_template')}
        >
          {i18n.translate('xpack.idxMgmt.componentTemplatesList.table.createButtonLabel', {
            defaultMessage: 'Create a component template',
          })}
        </EuiButton>,
      ],
      box: {
        incremental: true,
      },
      filters: [
        {
          type: 'field_value_toggle_group',
          field: 'usedBy.length',
          items: [
            {
              value: 1,
              name: i18n.translate(
                'xpack.idxMgmt.componentTemplatesList.table.inUseFilterOptionLabel',
                {
                  defaultMessage: 'In use',
                }
              ),
              operator: 'gte',
            },
            {
              value: 0,
              name: i18n.translate(
                'xpack.idxMgmt.componentTemplatesList.table.notInUseFilterOptionLabel',
                {
                  defaultMessage: 'Not in use',
                }
              ),
              operator: 'eq',
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
          /* eslint-disable-next-line @elastic/eui/href-or-on-click */
          <EuiLink
            {...reactRouterNavigate(
              history,
              {
                pathname: encodeURI(`/component_templates/${encodeURIComponent(name)}`),
              },
              () => trackMetric('click', UIM_COMPONENT_TEMPLATE_DETAILS)
            )}
            data-test-subj="templateDetailsLink"
          >
            {name}
          </EuiLink>
        ),
      },
      {
        field: 'usedBy',
        name: i18n.translate('xpack.idxMgmt.componentTemplatesList.table.isInUseColumnTitle', {
          defaultMessage: 'Index templates',
        }),
        sortable: true,
        render: (usedBy: string[]) => {
          if (usedBy.length) {
            return usedBy.length;
          }

          return (
            <EuiTextColor color="subdued">
              <i>
                <FormattedMessage
                  id="xpack.idxMgmt.componentTemplatesList.table.notInUseCellDescription"
                  defaultMessage="Not in use"
                />
              </i>
            </EuiTextColor>
          );
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
            name: i18n.translate('xpack.idxMgmt.componentTemplatesList.table.actionEditText', {
              defaultMessage: 'Edit',
            }),
            description: i18n.translate(
              'xpack.idxMgmt.componentTemplatesList.table.actionEditDecription',
              {
                defaultMessage: 'Edit this component template',
              }
            ),
            onClick: ({ name }: ComponentTemplateListItem) => onEditClick(name),
            isPrimary: true,
            icon: 'pencil',
            type: 'icon',
            'data-test-subj': 'editComponentTemplateButton',
          },
          {
            name: i18n.translate('xpack.idxMgmt.componentTemplatesList.table.actionCloneText', {
              defaultMessage: 'Clone',
            }),
            description: i18n.translate(
              'xpack.idxMgmt.componentTemplatesList.table.actionCloneDecription',
              {
                defaultMessage: 'Clone this component template',
              }
            ),
            onClick: ({ name }: ComponentTemplateListItem) => onCloneClick(name),
            icon: 'copy',
            type: 'icon',
            'data-test-subj': 'cloneComponentTemplateButton',
          },
          {
            name: i18n.translate('xpack.idxMgmt.componentTemplatesList.table.deleteActionLabel', {
              defaultMessage: 'Delete',
            }),
            description: i18n.translate(
              'xpack.idxMgmt.componentTemplatesList.table.deleteActionDescription',
              { defaultMessage: 'Delete this component template' }
            ),
            onClick: ({ name }) => onDeleteClick([name]),
            enabled: ({ usedBy }) => usedBy.length === 0,
            isPrimary: true,
            type: 'icon',
            icon: 'trash',
            color: 'danger',
            'data-test-subj': 'deleteComponentTemplateButton',
          },
        ],
      },
    ],
    items: componentTemplates ?? [],
  };

  return <EuiInMemoryTable {...tableProps} />;
};
