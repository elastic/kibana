/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FunctionComponent, useState, useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { METRIC_TYPE } from '@kbn/analytics';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiInMemoryTable,
  EuiButton,
  EuiInMemoryTableProps,
  EuiTextColor,
  EuiIcon,
  EuiLink,
  EuiBadge,
  EuiPopover,
  EuiFilterGroup,
  EuiSelectable,
  EuiFilterButton,
  EuiSelectableOption,
} from '@elastic/eui';
import { ScopedHistory } from '@kbn/core/public';

import { ComponentTemplateListItem, reactRouterNavigate } from '../shared_imports';
import { UIM_COMPONENT_TEMPLATE_DETAILS } from '../constants';
import { useComponentTemplatesContext } from '../component_templates_context';
import { DeprecatedBadge } from '../components';

const inUseFilterLabel = i18n.translate(
  'xpack.idxMgmt.componentTemplatesList.table.inUseFilterLabel',
  {
    defaultMessage: 'In use',
  }
);
const managedFilterLabel = i18n.translate(
  'xpack.idxMgmt.componentTemplatesList.table.managedFilterLabel',
  {
    defaultMessage: 'Managed',
  }
);
const deprecatedFilterLabel = i18n.translate(
  'xpack.idxMgmt.componentTemplatesList.table.deprecatedFilterLabel',
  {
    defaultMessage: 'Deprecated',
  }
);

export interface Props {
  componentTemplates: ComponentTemplateListItem[];
  defaultFilter: string;
  onReloadClick: () => void;
  onDeleteClick: (componentTemplateName: string[]) => void;
  onEditClick: (componentTemplateName: string) => void;
  onCloneClick: (componentTemplateName: string) => void;
  history: ScopedHistory;
}

export const ComponentTable: FunctionComponent<Props> = ({
  componentTemplates,
  defaultFilter,
  onReloadClick,
  onDeleteClick,
  onEditClick,
  onCloneClick,
  history,
}) => {
  const { trackMetric } = useComponentTemplatesContext();

  // By default, we want to show all the component templates that are not deprecated.
  const [filterOptions, setFilterOptions] = useState<EuiSelectableOption[]>([
    { key: 'inUse', label: inUseFilterLabel, 'data-test-subj': 'componentTemplates--inUseFilter' },
    {
      key: 'managed',
      label: managedFilterLabel,
      'data-test-subj': 'componentTemplates--managedFilter',
    },
    {
      key: 'deprecated',
      label: deprecatedFilterLabel,
      'data-test-subj': 'componentTemplates--deprecatedFilter',
      checked: 'off',
    },
  ]);

  const [selection, setSelection] = useState<ComponentTemplateListItem[]>([]);

  const filteredComponentTemplates = useMemo(() => {
    const inUseFilter = filterOptions.find(({ key }) => key === 'inUse')?.checked;
    const managedFilter = filterOptions.find(({ key }) => key === 'managed')?.checked;
    const deprecatedFilter = filterOptions.find(({ key }) => key === 'deprecated')?.checked;
    return (componentTemplates || []).filter((component) => {
      return !(
        (deprecatedFilter === 'off' && component.isDeprecated) ||
        (deprecatedFilter === 'on' && !component.isDeprecated) ||
        (managedFilter === 'off' && component.isManaged) ||
        (managedFilter === 'on' && !component.isManaged) ||
        (inUseFilter === 'off' && component.usedBy.length >= 1) ||
        (inUseFilter === 'on' && component.usedBy.length === 0)
      );
    });
  }, [componentTemplates, filterOptions]);

  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const onButtonClick = () => {
    setIsPopoverOpen(!isPopoverOpen);
  };
  const closePopover = () => {
    setIsPopoverOpen(false);
  };
  const button = (
    <EuiFilterButton
      data-test-subj="componentTemplatesFiltersButton"
      iconType="arrowDown"
      badgeColor="success"
      onClick={onButtonClick}
      isSelected={isPopoverOpen}
      numFilters={filterOptions.filter((item) => item.checked !== 'off').length}
      hasActiveFilters={!!filterOptions.find((item) => item.checked === 'on')}
      numActiveFilters={filterOptions.filter((item) => item.checked === 'on').length}
    >
      {i18n.translate('xpack.idxMgmt.componentTemplatesList.table.filtersButtonLabel', {
        defaultMessage: 'Filters',
      })}
    </EuiFilterButton>
  );

  const tableProps: EuiInMemoryTableProps<ComponentTemplateListItem> = {
    tableLayout: 'auto',
    itemId: 'name',
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
          color="success"
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
            defaultMessage: 'Create component template',
          })}
        </EuiButton>,
      ],
      box: {
        incremental: true,
        'data-test-subj': 'componentTemplatesSearch',
      },
      filters: [
        {
          type: 'custom_component',
          component: () => {
            return (
              <EuiFilterGroup>
                <EuiPopover
                  button={button}
                  isOpen={isPopoverOpen}
                  closePopover={closePopover}
                  panelPaddingSize="none"
                >
                  <EuiSelectable
                    allowExclusions
                    aria-label={i18n.translate(
                      'xpack.idxMgmt.componentTemplatesList.table.filtersAriaLabel',
                      {
                        defaultMessage: 'Filters',
                      }
                    )}
                    options={filterOptions}
                    onChange={setFilterOptions}
                  >
                    {(list) => <div style={{ width: 300 }}>{list}</div>}
                  </EuiSelectable>
                </EuiPopover>
              </EuiFilterGroup>
            );
          },
        },
      ],
      defaultQuery: defaultFilter,
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
        width: '45%',
        render: (name: string, item: ComponentTemplateListItem) => (
          <span>
            <EuiLink
              {...reactRouterNavigate(
                history,
                {
                  pathname: encodeURI(`/component_templates/${encodeURIComponent(name)}`),
                },
                () => trackMetric(METRIC_TYPE.CLICK, UIM_COMPONENT_TEMPLATE_DETAILS)
              )}
              data-test-subj="templateDetailsLink"
            >
              {name}
            </EuiLink>
            {item.isDeprecated && (
              <>
                &nbsp;
                <DeprecatedBadge />
              </>
            )}
            {item.isManaged && (
              <>
                {' '}
                <EuiBadge color="hollow" data-test-subj="isManagedBadge">
                  {i18n.translate('xpack.idxMgmt.componentTemplatesList.table.managedBadgeLabel', {
                    defaultMessage: 'Managed',
                  })}
                </EuiBadge>
              </>
            )}
          </span>
        ),
      },
      {
        field: 'usedBy',
        name: i18n.translate('xpack.idxMgmt.componentTemplatesList.table.isInUseColumnTitle', {
          defaultMessage: 'Usage count',
        }),
        sortable: ({ usedBy }: ComponentTemplateListItem) => usedBy.length,
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
        align: 'center',
        sortable: true,
        render: (hasMappings: boolean) => (hasMappings ? <EuiIcon type="check" /> : null),
      },
      {
        field: 'hasSettings',
        name: i18n.translate('xpack.idxMgmt.componentTemplatesList.table.settingsColumnTitle', {
          defaultMessage: 'Settings',
        }),
        truncateText: true,
        align: 'center',
        sortable: true,
        render: (hasSettings: boolean) => (hasSettings ? <EuiIcon type="check" /> : null),
      },
      {
        field: 'hasAliases',
        name: i18n.translate('xpack.idxMgmt.componentTemplatesList.table.aliasesColumnTitle', {
          defaultMessage: 'Aliases',
        }),
        truncateText: true,
        align: 'center',
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
    items: filteredComponentTemplates,
  };

  return <EuiInMemoryTable {...tableProps} />;
};
