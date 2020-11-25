/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useRef, useEffect, FC } from 'react';
import { EuiInMemoryTable, EuiBasicTableColumn, EuiLink } from '@elastic/eui';
import { Action as EuiTableAction } from '@elastic/eui/src/components/basic_table/action_types';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { TagsCapabilities, TagWithRelations } from '../../../common';
import { TagBadge } from '../../components';

interface TagTableProps {
  loading: boolean;
  capabilities: TagsCapabilities;
  tags: TagWithRelations[];
  selectedTags: TagWithRelations[];
  onSelectionChange: (selection: TagWithRelations[]) => void;
  onEdit: (tag: TagWithRelations) => void;
  onDelete: (tag: TagWithRelations) => void;
  getTagRelationUrl: (tag: TagWithRelations) => string;
  onShowRelations: (tag: TagWithRelations) => void;
}

const tablePagination = {
  initialPageSize: 20,
  pageSizeOptions: [5, 10, 20, 50],
};

const sorting = {
  sort: {
    field: 'name',
    direction: 'asc' as const,
  },
};

export const isModifiedOrPrevented = (event: React.MouseEvent) =>
  event.metaKey || event.altKey || event.ctrlKey || event.shiftKey || event.defaultPrevented;

export const TagTable: FC<TagTableProps> = ({
  loading,
  capabilities,
  tags,
  selectedTags,
  onEdit,
  onDelete,
  onShowRelations,
  getTagRelationUrl,
}) => {
  const tableRef = useRef<EuiInMemoryTable<TagWithRelations>>(null);

  useEffect(() => {
    if (tableRef.current) {
      tableRef.current.setSelection(selectedTags);
    }
  }, [selectedTags]);

  const actions: Array<EuiTableAction<TagWithRelations>> = [];
  if (capabilities.edit) {
    actions.push({
      name: i18n.translate('xpack.savedObjectsTagging.management.table.actions.edit.title', {
        defaultMessage: 'Edit',
      }),
      description: i18n.translate(
        'xpack.savedObjectsTagging.management.table.actions.edit.description',
        {
          defaultMessage: 'Edit this tag',
        }
      ),
      type: 'icon',
      icon: 'pencil',
      onClick: (object: TagWithRelations) => onEdit(object),
      'data-test-subj': 'tagsTableAction-edit',
    });
  }
  if (capabilities.delete) {
    actions.push({
      name: i18n.translate('xpack.savedObjectsTagging.management.table.actions.delete.title', {
        defaultMessage: 'Delete',
      }),
      description: i18n.translate(
        'xpack.savedObjectsTagging.management.table.actions.delete.description',
        {
          defaultMessage: 'Delete this tag',
        }
      ),
      type: 'icon',
      icon: 'trash',
      onClick: (object: TagWithRelations) => onDelete(object),
      'data-test-subj': 'tagsTableAction-delete',
    });
  }

  const columns: Array<EuiBasicTableColumn<TagWithRelations>> = [
    {
      field: 'name',
      name: i18n.translate('xpack.savedObjectsTagging.management.table.columns.name', {
        defaultMessage: 'Name',
      }),
      sortable: (tag: TagWithRelations) => tag.name,
      'data-test-subj': 'tagsTableRowName',
      render: (name: string, tag: TagWithRelations) => {
        return <TagBadge tag={tag} />;
      },
    },
    {
      field: 'description',
      name: i18n.translate('xpack.savedObjectsTagging.management.table.columns.description', {
        defaultMessage: 'Description',
      }),
      sortable: true,
      'data-test-subj': 'tagsTableRowDescription',
    },
    {
      field: 'relationCount',
      name: i18n.translate('xpack.savedObjectsTagging.management.table.columns.connections', {
        defaultMessage: 'Connections',
      }),
      sortable: (tag: TagWithRelations) => tag.relationCount,
      'data-test-subj': 'tagsTableRowConnections',
      render: (relationCount: number, tag: TagWithRelations) => {
        if (relationCount < 1) {
          return undefined;
        }

        const columnText = (
          <span data-test-subj="tagsTableRowConnectionsText">
            <FormattedMessage
              id="xpack.savedObjectsTagging.management.table.content.connectionCount"
              defaultMessage="{relationCount, plural, one {1 saved object} other {# saved objects}}"
              values={{ relationCount }}
            />
          </span>
        );

        return capabilities.viewConnections ? (
          // eslint-disable-next-line @elastic/eui/href-or-on-click
          <EuiLink
            data-test-subj="tagsTableRowConnectionsLink"
            href={getTagRelationUrl(tag)}
            onClick={(e: React.MouseEvent) => {
              if (!isModifiedOrPrevented(e) && e.button === 0) {
                e.preventDefault();
                onShowRelations(tag);
              }
            }}
          >
            {columnText}
          </EuiLink>
        ) : (
          columnText
        );
      },
    },
    ...(actions.length
      ? [
          {
            name: i18n.translate('xpack.savedObjectsTagging.management.table.columns.actions', {
              defaultMessage: 'Actions',
            }),
            width: '100px',
            actions,
          },
        ]
      : []),
  ];

  return (
    <EuiInMemoryTable
      data-test-subj="tagsManagementTable"
      ref={tableRef}
      loading={loading}
      itemId={'id'}
      columns={columns}
      items={tags}
      pagination={tablePagination}
      sorting={sorting}
      search={{
        box: {
          'data-test-subj': 'tagsManagementSearchBar',
          incremental: true,
          schema: {
            fields: {
              name: { type: 'string' },
              description: { type: 'string' },
            },
          },
        },
      }}
      rowProps={(item) => ({
        'data-test-subj': 'tagsTableRow',
      })}
    />
  );
};
