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
  EuiInMemoryTableProps,
  EuiTableFieldDataColumnType,
  EuiPopover,
  EuiContextMenu,
  EuiBadge,
  EuiToolTip,
  EuiSearchBarProps,
} from '@elastic/eui';
import { reactRouterNavigate } from '@kbn/kibana-react-plugin/public';

import { Pipeline } from '../../../../common/types';
import { useKibana } from '../../../shared_imports';

export interface Props {
  pipelines: Pipeline[];
  onReloadClick: () => void;
  onEditPipelineClick: (pipelineName: string) => void;
  onClonePipelineClick: (pipelineName: string) => void;
  onDeletePipelineClick: (pipelineName: string[]) => void;
}

export const deprecatedPipelineBadge = {
  badge: i18n.translate('xpack.ingestPipelines.list.table.deprecatedBadgeLabel', {
    defaultMessage: 'Deprecated',
  }),
  badgeTooltip: i18n.translate('xpack.ingestPipelines.list.table.deprecatedBadgeTooltip', {
    defaultMessage:
      'This pipeline is no longer supported and might be removed in a future release. Instead, use one of the other pipelines available or create a new one.',
  }),
};

export const PipelineTable: FunctionComponent<Props> = ({
  pipelines,
  onReloadClick,
  onEditPipelineClick,
  onClonePipelineClick,
  onDeletePipelineClick,
}) => {
  const [query, setQuery] = useState('');
  const { history } = useKibana().services;
  const [selection, setSelection] = useState<Pipeline[]>([]);
  const [showPopover, setShowPopover] = useState(false);

  const handleOnChange: EuiSearchBarProps['onChange'] = ({ queryText, error }) => {
    if (!error) {
      setQuery(queryText);
    }
  };

  const createMenuItems = [
    /**
     * Create pipeline
     */
    {
      name: i18n.translate('xpack.ingestPipelines.list.table.createPipelineButtonLabel', {
        defaultMessage: 'New pipeline',
      }),
      ...reactRouterNavigate(history, '/create'),
      'data-test-subj': `createNewPipeline`,
    },
    /**
     * Create pipeline from CSV
     */
    {
      name: i18n.translate('xpack.ingestPipelines.list.table.createPipelineFromCsvButtonLabel', {
        defaultMessage: 'New pipeline from CSV',
      }),
      ...reactRouterNavigate(history, '/csv_create'),
      'data-test-subj': `createPipelineFromCsv`,
    },
  ];

  const filteredPipelines = useMemo(() => {
    let result = pipelines ?? [];

    // When the query includes 'is:deprecated', we want to show deprecated pipelines.
    // Otherwise hide them all since they wont be supported in the future.
    if (query.includes('is:deprecated')) {
      result = result.filter((item) => item?.deprecated);
    } else {
      result = result.filter((item) => !item?.deprecated);
    }

    return result;
  }, [pipelines, query]);

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
        <EuiButton
          key="reloadButton"
          iconType="refresh"
          color="success"
          data-test-subj="reloadButton"
          onClick={onReloadClick}
        >
          {i18n.translate('xpack.ingestPipelines.list.table.reloadButtonLabel', {
            defaultMessage: 'Reload',
          })}
        </EuiButton>,
        <EuiPopover
          isOpen={showPopover}
          closePopover={() => setShowPopover(false)}
          button={
            <EuiButton
              fill
              iconSide="right"
              iconType="arrowDown"
              data-test-subj="createPipelineDropdown"
              key="createPipelineDropdown"
              onClick={() => setShowPopover((previousBool) => !previousBool)}
            >
              {i18n.translate('xpack.ingestPipelines.list.table.createPipelineDropdownLabel', {
                defaultMessage: 'Create pipeline',
              })}
            </EuiButton>
          }
          panelPaddingSize="none"
          repositionOnScroll
        >
          <EuiContextMenu
            initialPanelId={0}
            data-test-subj="autoFollowPatternActionContextMenu"
            panels={[
              {
                id: 0,
                items: createMenuItems,
              },
            ]}
          />
        </EuiPopover>,
      ],
      box: {
        incremental: true,
      },
      query,
      onChange: handleOnChange,
      filters: [
        {
          type: 'is',
          field: 'isManaged',
          name: i18n.translate('xpack.ingestPipelines.list.table.isManagedFilterLabel', {
            defaultMessage: 'Managed',
          }),
        },
        {
          type: 'is',
          field: 'deprecated',
          name: i18n.translate('xpack.ingestPipelines.list.table.isDeprecatedFilterLabel', {
            defaultMessage: 'Deprecated',
          }),
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
        name: i18n.translate('xpack.ingestPipelines.list.table.nameColumnTitle', {
          defaultMessage: 'Name',
        }),
        sortable: true,
        render: (name: string, pipeline) => (
          <EuiLink
            data-test-subj="pipelineDetailsLink"
            {...reactRouterNavigate(history, {
              pathname: '/',
              search: `pipeline=${encodeURIComponent(name)}`,
            })}
          >
            {name}
            {pipeline.deprecated && (
              <>
                &nbsp;
                <EuiToolTip content={deprecatedPipelineBadge.badgeTooltip}>
                  <EuiBadge color="warning" data-test-subj="isDeprecatedBadge">
                    {deprecatedPipelineBadge.badge}
                  </EuiBadge>
                </EuiToolTip>
              </>
            )}
            {pipeline.isManaged && (
              <>
                &nbsp;
                <EuiBadge color="hollow" data-test-subj="isManagedBadge">
                  {i18n.translate('xpack.ingestPipelines.list.table.managedBadgeLabel', {
                    defaultMessage: 'Managed',
                  })}
                </EuiBadge>
              </>
            )}
          </EuiLink>
        ),
      },
      {
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
  };

  return <EuiInMemoryTable {...tableProps} />;
};
