/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { MouseEventHandler, FC, useContext, useState } from 'react';

import { i18n } from '@kbn/i18n';

import {
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiCallOut,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPopover,
  EuiTitle,
  EuiInMemoryTable,
  EuiSearchBarProps,
} from '@elastic/eui';

import type { TransformId } from '../../../../../../common/types/transform';

import {
  useRefreshTransformList,
  TransformListRow,
  TRANSFORM_LIST_COLUMN,
} from '../../../../common';
import { useStopTransforms } from '../../../../hooks';
import { AuthorizationContext } from '../../../../lib/authorization';

import { CreateTransformButton } from '../create_transform_button';
import { RefreshTransformListButton } from '../refresh_transform_list_button';
import {
  isDeleteActionDisabled,
  useDeleteAction,
  DeleteActionName,
  DeleteActionModal,
} from '../action_delete';
import { useStartAction, StartActionName, StartActionModal } from '../action_start';
import { StopActionName } from '../action_stop';

import { ItemIdToExpandedRowMap } from './common';
import { useColumns } from './use_columns';
import { ExpandedRow } from './expanded_row';
import { transformFilters, filterTransforms } from './transform_search_bar';
import { useTableSettings } from './use_table_settings';

function getItemIdToExpandedRowMap(
  itemIds: TransformId[],
  transforms: TransformListRow[]
): ItemIdToExpandedRowMap {
  return itemIds.reduce((m: ItemIdToExpandedRowMap, transformId: TransformId) => {
    const item = transforms.find((transform) => transform.config.id === transformId);
    if (item !== undefined) {
      m[transformId] = <ExpandedRow item={item} />;
    }
    return m;
  }, {} as ItemIdToExpandedRowMap);
}

interface Props {
  errorMessage: any;
  isInitialized: boolean;
  onCreateTransform: MouseEventHandler<HTMLButtonElement>;
  transforms: TransformListRow[];
  transformsLoading: boolean;
}

export const TransformList: FC<Props> = ({
  errorMessage,
  isInitialized,
  onCreateTransform,
  transforms,
  transformsLoading,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const { refresh } = useRefreshTransformList({ isLoading: setIsLoading });

  const [filterActive, setFilterActive] = useState(false);

  const [filteredTransforms, setFilteredTransforms] = useState<TransformListRow[]>([]);
  const [expandedRowItemIds, setExpandedRowItemIds] = useState<TransformId[]>([]);
  const [transformSelection, setTransformSelection] = useState<TransformListRow[]>([]);
  const [isActionsMenuOpen, setIsActionsMenuOpen] = useState(false);
  const bulkStartAction = useStartAction(false);
  const bulkDeleteAction = useDeleteAction(false);

  const [searchError, setSearchError] = useState<any>(undefined);
  const stopTransforms = useStopTransforms();

  const { capabilities } = useContext(AuthorizationContext);
  const disabled =
    !capabilities.canCreateTransform ||
    !capabilities.canPreviewTransform ||
    !capabilities.canStartStopTransform;

  const { sorting, pagination, onTableChange } = useTableSettings<TransformListRow>(
    TRANSFORM_LIST_COLUMN.ID,
    transforms
  );

  const { columns, modals: singleActionModals } = useColumns(
    expandedRowItemIds,
    setExpandedRowItemIds,
    transformSelection
  );

  const onQueryChange = ({
    query,
    error,
  }: Parameters<NonNullable<EuiSearchBarProps['onChange']>>[0]) => {
    if (error) {
      setSearchError(error.message);
    } else {
      let clauses: any = [];
      if (query && query.ast !== undefined && query.ast.clauses !== undefined) {
        clauses = query.ast.clauses;
      }
      if (clauses.length > 0) {
        setFilterActive(true);
        const filtered = filterTransforms(transforms, clauses);
        setFilteredTransforms(filtered);
      } else {
        setFilterActive(false);
      }
      setSearchError(undefined);
    }
  };

  // Before the transforms have been loaded for the first time, display the loading indicator only.
  // Otherwise a user would see 'No transforms found' during the initial loading.
  if (!isInitialized) {
    return null;
  }

  if (typeof errorMessage !== 'undefined') {
    return (
      <EuiCallOut
        title={i18n.translate('xpack.transform.list.errorPromptTitle', {
          defaultMessage: 'An error occurred getting the transform list.',
        })}
        color="danger"
        iconType="alert"
      >
        <pre>{JSON.stringify(errorMessage)}</pre>
      </EuiCallOut>
    );
  }

  if (transforms.length === 0) {
    return (
      <EuiEmptyPrompt
        title={
          <h2>
            {i18n.translate('xpack.transform.list.emptyPromptTitle', {
              defaultMessage: 'No transforms found',
            })}
          </h2>
        }
        actions={[
          <EuiButtonEmpty
            onClick={onCreateTransform}
            isDisabled={disabled}
            data-test-subj="transformCreateFirstButton"
          >
            {i18n.translate('xpack.transform.list.emptyPromptButtonText', {
              defaultMessage: 'Create your first transform',
            })}
          </EuiButtonEmpty>,
        ]}
        data-test-subj="transformNoTransformsFound"
      />
    );
  }

  const itemIdToExpandedRowMap = getItemIdToExpandedRowMap(expandedRowItemIds, transforms);

  const bulkActionMenuItems = [
    <div key="startAction" className="transform__BulkActionItem">
      <EuiButtonEmpty onClick={() => bulkStartAction.openModal(transformSelection)}>
        <StartActionName items={transformSelection} />
      </EuiButtonEmpty>
    </div>,
    <div key="stopAction" className="transform__BulkActionItem">
      <EuiButtonEmpty
        onClick={() =>
          stopTransforms(transformSelection.map((t) => ({ id: t.id, state: t.stats.state })))
        }
      >
        <StopActionName items={transformSelection} />
      </EuiButtonEmpty>
    </div>,
    <div key="deleteAction" className="transform__BulkActionItem">
      <EuiButtonEmpty onClick={() => bulkDeleteAction.openModal(transformSelection)}>
        <DeleteActionName
          canDeleteTransform={capabilities.canDeleteTransform}
          disabled={isDeleteActionDisabled(transformSelection, false)}
          isBulkAction={true}
        />
      </EuiButtonEmpty>
    </div>,
  ];

  const renderToolsLeft = () => {
    const buttonIcon = (
      <EuiButtonIcon
        size="s"
        iconType="gear"
        color="text"
        onClick={() => {
          setIsActionsMenuOpen(true);
        }}
        aria-label={i18n.translate(
          'xpack.transform.multiTransformActionsMenu.managementActionsAriaLabel',
          {
            defaultMessage: 'Management actions',
          }
        )}
      />
    );

    const bulkActionIcon = (
      <EuiPopover
        key="bulkActionIcon"
        id="transformBulkActionsMenu"
        button={buttonIcon}
        isOpen={isActionsMenuOpen}
        closePopover={() => setIsActionsMenuOpen(false)}
        panelPaddingSize="s"
        anchorPosition="rightUp"
      >
        {bulkActionMenuItems}
      </EuiPopover>
    );

    return [
      <EuiTitle key="selectedText" size="s">
        <h3>
          {i18n.translate('xpack.transform.multiTransformActionsMenu.transformsCount', {
            defaultMessage: '{count} {count, plural, one {transform} other {transforms}} selected',
            values: { count: transformSelection.length },
          })}
        </h3>
      </EuiTitle>,
      <div key="bulkActionsBorder" className="transform__BulkActionsBorder" />,
      bulkActionIcon,
    ];
  };

  const toolsRight = (
    <EuiFlexGroup gutterSize="m" justifyContent="spaceAround">
      <EuiFlexItem>
        <RefreshTransformListButton onClick={refresh} isLoading={isLoading} />
      </EuiFlexItem>
      <EuiFlexItem>
        <CreateTransformButton onClick={onCreateTransform} />
      </EuiFlexItem>
    </EuiFlexGroup>
  );

  const search = {
    toolsLeft: transformSelection.length > 0 ? renderToolsLeft() : undefined,
    toolsRight,
    onChange: onQueryChange,
    box: {
      incremental: true,
    },
    filters: transformFilters,
  };

  const selection = {
    onSelectionChange: (selected: TransformListRow[]) => setTransformSelection(selected),
  };

  return (
    <div data-test-subj="transformListTableContainer">
      {/* Bulk Action Modals */}
      {bulkStartAction.isModalVisible && <StartActionModal {...bulkStartAction} />}
      {bulkDeleteAction.isModalVisible && <DeleteActionModal {...bulkDeleteAction} />}

      {/* Single Action Modals */}
      {singleActionModals}

      <EuiInMemoryTable
        allowNeutralSort={false}
        className="transform__TransformTable"
        columns={columns}
        error={searchError}
        hasActions={false}
        isExpandable={true}
        isSelectable={false}
        items={filterActive ? filteredTransforms : transforms}
        itemId={TRANSFORM_LIST_COLUMN.ID}
        itemIdToExpandedRowMap={itemIdToExpandedRowMap}
        loading={isLoading || transformsLoading}
        onTableChange={onTableChange}
        pagination={pagination}
        rowProps={(item) => ({
          'data-test-subj': `transformListRow row-${item.id}`,
        })}
        selection={selection}
        sorting={sorting}
        search={search}
        data-test-subj={`transformListTable ${
          isLoading || transformsLoading ? 'loading' : 'loaded'
        }`}
      />
    </div>
  );
};
