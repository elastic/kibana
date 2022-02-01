/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { MouseEventHandler, FC, useContext, useState } from 'react';

import { i18n } from '@kbn/i18n';

import {
  EuiButton,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPageContent,
  EuiPopover,
  EuiSpacer,
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
import { AuthorizationContext } from '../../../../lib/authorization';

import { CreateTransformButton } from '../create_transform_button';
import { RefreshTransformListButton } from '../refresh_transform_list_button';
import {
  isDeleteActionDisabled,
  useDeleteAction,
  DeleteActionName,
  DeleteActionModal,
} from '../action_delete';
import {
  isResetActionDisabled,
  useResetAction,
  ResetActionName,
  ResetActionModal,
} from '../action_reset';
import { useStartAction, StartActionName, StartActionModal } from '../action_start';
import { StopActionName, useStopAction } from '../action_stop';

import { useColumns } from './use_columns';
import { ExpandedRow } from './expanded_row';
import { transformFilters, filterTransforms } from './transform_search_bar_filters';
import { useTableSettings } from './use_table_settings';
import { useAlertRuleFlyout } from '../../../../../alerting/transform_alerting_flyout';
import { TransformHealthAlertRule } from '../../../../../../common/types/alerting';
import { StopActionModal } from '../action_stop/stop_action_modal';

type ItemIdToExpandedRowMap = Record<string, JSX.Element>;

function getItemIdToExpandedRowMap(
  itemIds: TransformId[],
  transforms: TransformListRow[],
  onAlertEdit: (alertRule: TransformHealthAlertRule) => void
): ItemIdToExpandedRowMap {
  return itemIds.reduce((m: ItemIdToExpandedRowMap, transformId: TransformId) => {
    const item = transforms.find((transform) => transform.config.id === transformId);
    if (item !== undefined) {
      m[transformId] = <ExpandedRow item={item} onAlertEdit={onAlertEdit} />;
    }
    return m;
  }, {} as ItemIdToExpandedRowMap);
}

interface TransformListProps {
  onCreateTransform: MouseEventHandler<HTMLButtonElement>;
  transformNodes: number;
  transforms: TransformListRow[];
  transformsLoading: boolean;
}

export const TransformList: FC<TransformListProps> = ({
  onCreateTransform,
  transformNodes,
  transforms,
  transformsLoading,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const { refresh } = useRefreshTransformList({ isLoading: setIsLoading });
  const { setEditAlertRule } = useAlertRuleFlyout();

  const [query, setQuery] = useState<Parameters<NonNullable<EuiSearchBarProps['onChange']>>[0]>();

  const [expandedRowItemIds, setExpandedRowItemIds] = useState<TransformId[]>([]);
  const [transformSelection, setTransformSelection] = useState<TransformListRow[]>([]);
  const [isActionsMenuOpen, setIsActionsMenuOpen] = useState(false);
  const bulkStartAction = useStartAction(false, transformNodes);
  const bulkDeleteAction = useDeleteAction(false);
  const bulkResetAction = useResetAction(false);
  const bulkStopAction = useStopAction(false);

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
    transformNodes,
    transformSelection
  );

  const searchError = query?.error ? query?.error.message : undefined;
  const clauses = query?.query?.ast?.clauses ?? [];
  const filteredTransforms =
    clauses.length > 0 ? filterTransforms(transforms, clauses) : transforms;

  if (transforms.length === 0 && transformNodes === 0) {
    return null;
  }

  if (transforms.length === 0) {
    return (
      <EuiFlexGroup justifyContent="spaceAround">
        <EuiFlexItem grow={false}>
          <EuiSpacer size="l" />
          <EuiPageContent verticalPosition="center" horizontalPosition="center" color="subdued">
            <EuiEmptyPrompt
              title={
                <h2>
                  {i18n.translate('xpack.transform.list.emptyPromptTitle', {
                    defaultMessage: 'No transforms found',
                  })}
                </h2>
              }
              actions={[
                <EuiButton
                  color="primary"
                  fill
                  onClick={onCreateTransform}
                  isDisabled={disabled}
                  data-test-subj="transformCreateFirstButton"
                >
                  {i18n.translate('xpack.transform.list.emptyPromptButtonText', {
                    defaultMessage: 'Create your first transform',
                  })}
                </EuiButton>,
              ]}
              data-test-subj="transformNoTransformsFound"
            />
          </EuiPageContent>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  const itemIdToExpandedRowMap = getItemIdToExpandedRowMap(
    expandedRowItemIds,
    transforms,
    setEditAlertRule
  );

  const bulkActionMenuItems = [
    <div key="startAction" className="transform__BulkActionItem">
      <EuiButtonEmpty onClick={() => bulkStartAction.openModal(transformSelection)}>
        <StartActionName items={transformSelection} transformNodes={transformNodes} />
      </EuiButtonEmpty>
    </div>,
    <div key="stopAction" className="transform__BulkActionItem">
      <EuiButtonEmpty
        onClick={() => {
          bulkStopAction.openModal(transformSelection);
        }}
      >
        <StopActionName items={transformSelection} />
      </EuiButtonEmpty>
    </div>,
    <div key="resetAction" className="transform__BulkActionItem">
      <EuiButtonEmpty
        onClick={() => {
          bulkResetAction.openModal(transformSelection);
        }}
      >
        <ResetActionName
          canResetTransform={capabilities.canResetTransform}
          disabled={isResetActionDisabled(transformSelection, false)}
          isBulkAction={true}
        />
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
        <CreateTransformButton onClick={onCreateTransform} transformNodes={transformNodes} />
      </EuiFlexItem>
    </EuiFlexGroup>
  );

  const search = {
    toolsLeft: transformSelection.length > 0 ? renderToolsLeft() : undefined,
    toolsRight,
    onChange: setQuery,
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
      {bulkResetAction.isModalVisible && <ResetActionModal {...bulkResetAction} />}
      {bulkStopAction.isModalVisible && <StopActionModal {...bulkStopAction} />}

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
        items={filteredTransforms}
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
