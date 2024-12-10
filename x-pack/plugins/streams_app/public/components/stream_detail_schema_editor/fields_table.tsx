/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import {
  EuiButtonIcon,
  EuiContextMenu,
  EuiDataGrid,
  EuiPopover,
  EuiSearchBar,
  useGeneratedHtmlId,
} from '@elastic/eui';
import type {
  EuiContextMenuPanelDescriptor,
  EuiContextMenuPanelItemDescriptor,
  EuiDataGridProps,
  Query,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import useToggle from 'react-use/lib/useToggle';
import { ReadStreamDefinition } from '@kbn/streams-plugin/common/types';
import { FieldType } from './field_type';
import { FieldStatus } from './field_status';
import { FieldEntry, SchemaEditorEditingState } from './hooks/use_editing_state';
import { SchemaEditorUnpromotingState } from './hooks/use_unpromoting_state';
import { FieldParent } from './field_parent';

interface FieldsTableContainerProps {
  definition: ReadStreamDefinition;
  unmappedFieldsResult?: string[];
  isLoadingUnmappedFields: boolean;
  query?: Query;
  editingState: SchemaEditorEditingState;
  unpromotingState: SchemaEditorUnpromotingState;
}

const COLUMNS = {
  name: {
    display: i18n.translate('xpack.streams.streamDetailSchemaEditorFieldsTablenameHeader', {
      defaultMessage: 'Field',
    }),
  },
  type: {
    display: i18n.translate('xpack.streams.streamDetailSchemaEditorFieldsTabletypeHeader', {
      defaultMessage: 'Type',
    }),
  },
  format: {
    display: i18n.translate('xpack.streams.streamDetailSchemaEditorFieldsTableformatHeader', {
      defaultMessage: 'Format',
    }),
  },
  parent: {
    display: i18n.translate('xpack.streams.streamDetailSchemaEditorFieldsTableFieldParentHeader', {
      defaultMessage: 'Field Parent (Stream)',
    }),
  },
  status: {
    display: i18n.translate('xpack.streams.streamDetailSchemaEditorFieldsTablestatusHeader', {
      defaultMessage: 'Status',
    }),
  },
};

export const EMPTY_CONTENT = '-----';

export const FieldsTableContainer = ({
  definition,
  unmappedFieldsResult,
  isLoadingUnmappedFields,
  query,
  editingState,
  unpromotingState,
}: FieldsTableContainerProps) => {
  const inheritedFields = useMemo(() => {
    return definition.inheritedFields.map((field) => ({
      name: field.name,
      type: field.type,
      format: field.format,
      parent: field.from,
      status: 'inherited' as const,
    }));
  }, [definition]);

  const filteredInheritedFields = useMemo(() => {
    if (!query) return inheritedFields;
    return EuiSearchBar.Query.execute(query, inheritedFields, {
      defaultFields: ['name', 'type'],
    });
  }, [inheritedFields, query]);

  const mappedFields = useMemo(() => {
    return definition.fields.map((field) => ({
      name: field.name,
      type: field.type,
      format: field.format,
      parent: definition.id,
      status: 'mapped' as const,
    }));
  }, [definition]);

  const filteredMappedFields = useMemo(() => {
    if (!query) return mappedFields;
    return EuiSearchBar.Query.execute(query, mappedFields, {
      defaultFields: ['name', 'type'],
    });
  }, [mappedFields, query]);

  const unmappedFields = useMemo(() => {
    return unmappedFieldsResult
      ? unmappedFieldsResult.map((field) => ({
          name: field,
          parent: definition.id,
          status: 'unmapped' as const,
        }))
      : [];
  }, [definition.id, unmappedFieldsResult]);

  const filteredUnmappedFields = useMemo(() => {
    if (!unmappedFieldsResult) return [];
    if (!query) return unmappedFields;
    return EuiSearchBar.Query.execute(query, unmappedFields, {
      defaultFields: ['name'],
    });
  }, [unmappedFieldsResult, query, unmappedFields]);

  const allFilteredFields = useMemo(() => {
    return [...filteredInheritedFields, ...filteredMappedFields, ...filteredUnmappedFields];
  }, [filteredInheritedFields, filteredMappedFields, filteredUnmappedFields]);

  return (
    <FieldsTable
      fields={allFilteredFields}
      editingState={editingState}
      unpromotingState={unpromotingState}
      definition={definition}
    />
  );
};

interface FieldsTableProps {
  definition: ReadStreamDefinition;
  fields: FieldEntry[];
  editingState: SchemaEditorEditingState;
  unpromotingState: SchemaEditorUnpromotingState;
}

const FieldsTable = ({ definition, fields, editingState, unpromotingState }: FieldsTableProps) => {
  const [visibleColumns, setVisibleColumns] = useState(Object.keys(COLUMNS));

  const trailingColumns = useMemo(() => {
    return [
      {
        id: 'actions',
        width: 40,
        headerCellRender: () => null,
        rowCellRender: ({ rowIndex }) => {
          const field = fields[rowIndex];

          let actions: ActionsCellActionsDescriptor[] = [];

          switch (field.status) {
            case 'mapped':
              actions = [
                {
                  name: i18n.translate('xpack.streams.actions.viewFieldLabel', {
                    defaultMessage: 'View field',
                  }),
                  disabled: editingState.isSaving,
                  onClick: (fieldEntry: FieldEntry) => {
                    editingState.selectField(fieldEntry, false);
                  },
                },
                {
                  name: i18n.translate('xpack.streams.actions.editFieldLabel', {
                    defaultMessage: 'Edit field',
                  }),
                  disabled: editingState.isSaving,
                  onClick: (fieldEntry: FieldEntry) => {
                    editingState.selectField(fieldEntry, true);
                  },
                },
                {
                  name: i18n.translate('xpack.streams.actions.unpromoteFieldLabel', {
                    defaultMessage: 'Unmap field',
                  }),
                  disabled: unpromotingState.isUnpromotingField,
                  onClick: (fieldEntry: FieldEntry) => {
                    unpromotingState.setSelectedField(fieldEntry.name);
                  },
                },
              ];
              break;
            case 'unmapped':
              actions = [
                {
                  name: i18n.translate('xpack.streams.actions.viewFieldLabel', {
                    defaultMessage: 'View field',
                  }),
                  disabled: editingState.isSaving,
                  onClick: (fieldEntry: FieldEntry) => {
                    editingState.selectField(fieldEntry, false);
                  },
                },
                {
                  name: i18n.translate('xpack.streams.actions.mapFieldLabel', {
                    defaultMessage: 'Map field',
                  }),
                  disabled: editingState.isSaving,
                  onClick: (fieldEntry: FieldEntry) => {
                    editingState.selectField(fieldEntry, true);
                  },
                },
              ];
              break;
            case 'inherited':
              actions = [
                {
                  name: i18n.translate('xpack.streams.actions.viewFieldLabel', {
                    defaultMessage: 'View field',
                  }),
                  disabled: editingState.isSaving,
                  onClick: (fieldEntry: FieldEntry) => {
                    editingState.selectField(fieldEntry, false);
                  },
                },
              ];
              break;
          }

          return (
            <ActionsCell
              panels={[
                {
                  id: 0,
                  title: i18n.translate(
                    'xpack.streams.streamDetailSchemaEditorFieldsTableActionsTitle',
                    {
                      defaultMessage: 'Actions',
                    }
                  ),
                  items: actions.map((action) => ({
                    name: action.name,
                    icon: action.icon,
                    onClick: (event) => {
                      action.onClick(field);
                    },
                  })),
                },
              ]}
            />
          );
        },
      },
    ] as EuiDataGridProps['trailingControlColumns'];
  }, [editingState, fields, unpromotingState]);

  return (
    <EuiDataGrid
      aria-label={i18n.translate(
        'xpack.streams.streamDetailSchemaEditor.fieldsTable.actionsTitle',
        {
          defaultMessage: 'Preview',
        }
      )}
      columns={visibleColumns.map((columnId) => ({
        id: columnId,
        ...COLUMNS[columnId as keyof typeof COLUMNS],
      }))}
      columnVisibility={{
        visibleColumns,
        setVisibleColumns,
        canDragAndDropColumns: false,
      }}
      toolbarVisibility={false}
      rowCount={fields.length}
      renderCellValue={({ rowIndex, columnId }) => {
        const field = fields[rowIndex];
        if (columnId === 'type') {
          const fieldType = field.type;
          if (!fieldType) return EMPTY_CONTENT;
          return <FieldType type={fieldType} />;
        } else if (columnId === 'parent') {
          return <FieldParent parent={field.parent} linkEnabled={field.parent !== definition.id} />;
        } else if (columnId === 'status') {
          return <FieldStatus status={field.status} />;
        } else {
          return field[columnId as keyof FieldEntry] || EMPTY_CONTENT;
        }
      }}
      trailingControlColumns={trailingColumns}
      gridStyle={{
        border: 'none',
        rowHover: 'none',
        header: 'underline',
      }}
    />
  );
};

export const ActionsCell = ({ panels }: { panels: EuiContextMenuPanelDescriptor[] }) => {
  const contextMenuPopoverId = useGeneratedHtmlId({
    prefix: 'fieldsTableContextMenuPopover',
  });

  const [popoverIsOpen, togglePopoverIsOpen] = useToggle(false);

  return (
    <EuiPopover
      id={contextMenuPopoverId}
      button={
        <EuiButtonIcon
          aria-label={i18n.translate(
            'xpack.streams.streamDetailSchemaEditorFieldsTableActionsTriggerButton',
            {
              defaultMessage: 'Open actions menu',
            }
          )}
          data-test-subj="streamsAppActionsButton"
          iconType="boxesVertical"
          onClick={() => {
            togglePopoverIsOpen();
          }}
        />
      }
      isOpen={popoverIsOpen}
      closePopover={() => togglePopoverIsOpen(false)}
    >
      <EuiContextMenu
        initialPanelId={0}
        panels={panels.map((panel) => ({
          ...panel,
          items: panel.items?.map((item) => ({
            name: item.name,
            icon: item.icon,
            onClick: (event) => {
              if (item.onClick) {
                item.onClick(event as any);
              }
              togglePopoverIsOpen(false);
            },
          })),
        }))}
      />
    </EuiPopover>
  );
};

export type ActionsCellActionsDescriptor = Omit<EuiContextMenuPanelItemDescriptor, 'onClick'> & {
  onClick: (field: FieldEntry) => void;
};
