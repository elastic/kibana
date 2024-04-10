/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FunctionComponent, useState, useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiInMemoryTable,
  EuiLink,
  EuiButton,
  EuiButtonIcon,
  EuiInMemoryTableProps,
  EuiTableFieldDataColumnType,
  EuiPopover,
  EuiFilterGroup,
  EuiSelectable,
  EuiFilterButton,
  EuiSelectableOption,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';
import { reactRouterNavigate } from '@kbn/kibana-react-plugin/public';

import { Pipeline } from '../../../../common/types';
import { useKibana } from '../../../shared_imports';
import { DeprecatedPipelineBadge, ManagedPipelineBadge } from '../../components/pipeline_elements';

export interface Props {
  pipelines: Pipeline[];
  onReloadClick: () => void;
  isLoading: boolean;
  onEditPipelineClick: (pipelineName: string) => void;
  onClonePipelineClick: (pipelineName: string) => void;
  onDeletePipelineClick: (pipelineName: string[]) => void;
}

const deprecatedFilterLabel = i18n.translate(
  'xpack.ingestPipelines.list.table.deprecatedFilterLabel',
  {
    defaultMessage: 'Deprecated',
  }
);

const managedFilterLabel = i18n.translate('xpack.ingestPipelines.list.table.managedFilterLabel', {
  defaultMessage: 'Managed',
});

export const PipelineTable: FunctionComponent<Props> = ({
  pipelines,
  isLoading,
  onReloadClick,
  onEditPipelineClick,
  onClonePipelineClick,
  onDeletePipelineClick,
}) => {
  const [filterOptions, setFilterOptions] = useState<EuiSelectableOption[]>([
    { key: 'managed', label: managedFilterLabel },
    { key: 'deprecated', label: deprecatedFilterLabel, checked: 'off' },
  ]);
  const { history } = useKibana().services;
  const [selection, setSelection] = useState<Pipeline[]>([]);

  const filteredPipelines = useMemo(() => {
    return (pipelines || []).filter((pipeline) => {
      const deprecatedFilter = filterOptions.find(({ key }) => key === 'deprecated')?.checked;
      const managedFilter = filterOptions.find(({ key }) => key === 'managed')?.checked;
      return !(
        (deprecatedFilter === 'off' && pipeline.deprecated) ||
        (deprecatedFilter === 'on' && !pipeline.deprecated) ||
        (managedFilter === 'off' && pipeline.isManaged) ||
        (managedFilter === 'on' && !pipeline.isManaged)
      );
    });
  }, [pipelines, filterOptions]);

  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const onButtonClick = () => {
    setIsPopoverOpen(!isPopoverOpen);
  };
  const closePopover = () => {
    setIsPopoverOpen(false);
  };

  const button = (
    <EuiFilterButton
      iconType="arrowDown"
      badgeColor="success"
      onClick={onButtonClick}
      isSelected={isPopoverOpen}
      numFilters={filterOptions.filter((item) => item.checked !== 'off').length}
      hasActiveFilters={!!filterOptions.find((item) => item.checked === 'on')}
      numActiveFilters={filterOptions.filter((item) => item.checked === 'on').length}
    >
      {i18n.translate('xpack.ingestPipelines.list.table.filtersButtonLabel', {
        defaultMessage: 'Filters',
      })}
    </EuiFilterButton>
  );

  const tableProps: EuiInMemoryTableProps<Pipeline> = {
    itemId: 'name',
    isSelectable: true,
    'data-test-subj': 'pipelinesTable',
    sorting: { sort: { field: 'name', direction: 'asc' } },
    selection: {
      onSelectionChange: setSelection,
    },
    rowProps: () => ({
      'data-test-subj': 'pipelineTableRow',
    }),
    cellProps: (pipeline, column) => {
      const { field } = column as EuiTableFieldDataColumnType<Pipeline>;

      return {
        'data-test-subj': `pipelineTableRow-${field}`,
      };
    },
    search: {
      toolsLeft:
        selection.length > 0 ? (
          <EuiButton
            data-test-subj="deletePipelinesButton"
            onClick={() => onDeletePipelineClick(selection.map((pipeline) => pipeline.name))}
            color="danger"
          >
            <FormattedMessage
              id="xpack.ingestPipelines.list.table.deletePipelinesButtonLabel"
              defaultMessage="Delete {count, plural, one {pipeline} other {pipelines} }"
              values={{ count: selection.length }}
            />
          </EuiButton>
        ) : undefined,
      toolsRight: [
        <EuiButtonIcon
          key="reloadButton"
          iconType="refresh"
          color="success"
          aria-label="refresh button"
          data-test-subj="reloadButton"
          size="m"
          display="base"
          onClick={onReloadClick}
        />,
      ],
      box: {
        incremental: true,
        'data-test-subj': 'pipelineTableSearch',
      },
      filters: [
        {
          type: 'custom_component',
          component: () => {
            return (
              <EuiFilterGroup>
                <EuiPopover
                  id="popoverID"
                  button={button}
                  isOpen={isPopoverOpen}
                  closePopover={closePopover}
                  panelPaddingSize="none"
                >
                  <EuiSelectable
                    allowExclusions
                    aria-label={i18n.translate(
                      'xpack.ingestPipelines.list.table.filtersAriaLabel',
                      {
                        defaultMessage: 'Filters',
                      }
                    )}
                    options={filterOptions as EuiSelectableOption[]}
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
    },
    pagination: {
      initialPageSize: 10,
      pageSizeOptions: [10, 20, 50],
    },
    columns: [
      {
        width: '35%',
        field: 'name',
        name: i18n.translate('xpack.ingestPipelines.list.table.nameColumnTitle', {
          defaultMessage: 'Name',
        }),
        sortable: true,
        render: (name: string, pipeline: Pipeline) => (
          <EuiFlexGroup gutterSize='none' alignItems="center">
            <EuiFlexItem>
              <EuiLink
                data-test-subj="pipelineDetailsLink"
                {...reactRouterNavigate(history, {
                  pathname: '/',
                  search: `pipeline=${encodeURIComponent(name)}`,
                })}
              >
                {name}
              </EuiLink>
            </EuiFlexItem>

            <EuiFlexItem grow={false}>
              <EuiFlexGroup direction="column" gutterSize="xs" alignItems="center">
                {pipeline.isManaged && (
                  <EuiFlexItem grow={false}>
                    <ManagedPipelineBadge />
                  </EuiFlexItem>
                )}
                {pipeline.deprecated && (
                  <EuiFlexItem grow={false}>
                    <DeprecatedPipelineBadge />
                  </EuiFlexItem>
                )}
              </EuiFlexGroup>
            </EuiFlexItem>
          </EuiFlexGroup>
        ),
      },
      {
        field: 'description',
        sortable: true,
        name: i18n.translate('xpack.ingestPipelines.list.table.descriptionColumnTitle', {
          defaultMessage: 'Description',
        }),
      },
      {
        width: '120px',
        name: i18n.translate('xpack.ingestPipelines.list.table.preprocessorsColumnTitle', {
          defaultMessage: 'Preprocessors',
        }),
        align: 'right',
        dataType: 'number',
        sortable: ({ processors }: Pipeline) => processors.length,
        render: ({ processors }: Pipeline) => processors.length,
      },
      {
        width: '120px',
        name: (
          <FormattedMessage
            id="xpack.ingestPipelines.list.table.actionColumnTitle"
            defaultMessage="Actions"
          />
        ),
        actions: [
          {
            isPrimary: true,
            name: i18n.translate('xpack.ingestPipelines.list.table.editActionLabel', {
              defaultMessage: 'Edit',
            }),
            description: i18n.translate('xpack.ingestPipelines.list.table.editActionDescription', {
              defaultMessage: 'Edit this pipeline',
            }),
            type: 'icon',
            icon: 'pencil',
            onClick: ({ name }) => onEditPipelineClick(name),
          },
          {
            name: i18n.translate('xpack.ingestPipelines.list.table.cloneActionLabel', {
              defaultMessage: 'Clone',
            }),
            description: i18n.translate('xpack.ingestPipelines.list.table.cloneActionDescription', {
              defaultMessage: 'Clone this pipeline',
            }),
            type: 'icon',
            icon: 'copy',
            onClick: ({ name }) => onClonePipelineClick(name),
          },
          {
            isPrimary: true,
            name: i18n.translate('xpack.ingestPipelines.list.table.deleteActionLabel', {
              defaultMessage: 'Delete',
            }),
            description: i18n.translate(
              'xpack.ingestPipelines.list.table.deleteActionDescription',
              { defaultMessage: 'Delete this pipeline' }
            ),
            type: 'icon',
            icon: 'trash',
            color: 'danger',
            onClick: ({ name }) => onDeletePipelineClick([name]),
          },
        ],
      },
    ],
    items: filteredPipelines,
    loading: isLoading,
  };

  return <EuiInMemoryTable {...tableProps} />;
};
