/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { MouseEventHandler, FC, useContext, useState } from 'react';

import { i18n } from '@kbn/i18n';

import {
  Direction,
  EuiBadge,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiCallOut,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiInMemoryTable,
  EuiSearchBarProps,
  EuiPopover,
  EuiTitle,
} from '@elastic/eui';

import { TransformId, TRANSFORM_STATE } from '../../../../../../common';

import {
  useRefreshTransformList,
  TransformListRow,
  TRANSFORM_MODE,
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

import { ItemIdToExpandedRowMap, Clause, TermClause, FieldClause, Value } from './common';
import { getTaskStateBadge, useColumns } from './use_columns';
import { ExpandedRow } from './expanded_row';

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

function stringMatch(str: string | undefined, substr: any) {
  return (
    typeof str === 'string' &&
    typeof substr === 'string' &&
    (str.toLowerCase().match(substr.toLowerCase()) === null) === false
  );
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

  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  const [sortField, setSortField] = useState<string>(TRANSFORM_LIST_COLUMN.ID);
  const [sortDirection, setSortDirection] = useState<Direction>('asc');

  const stopTransforms = useStopTransforms();

  const { capabilities } = useContext(AuthorizationContext);
  const disabled =
    !capabilities.canCreateTransform ||
    !capabilities.canPreviewTransform ||
    !capabilities.canStartStopTransform;

  const onQueryChange = ({
    query,
    error,
  }: Parameters<NonNullable<EuiSearchBarProps['onChange']>>[0]) => {
    if (error) {
      setSearchError(error.message);
    } else {
      let clauses: Clause[] = [];
      if (query && query.ast !== undefined && query.ast.clauses !== undefined) {
        clauses = query.ast.clauses;
      }
      if (clauses.length > 0) {
        setFilterActive(true);
        filterTransforms(clauses as Array<TermClause | FieldClause>);
      } else {
        setFilterActive(false);
      }
      setSearchError(undefined);
    }
  };

  const filterTransforms = (clauses: Array<TermClause | FieldClause>) => {
    setIsLoading(true);
    // keep count of the number of matches we make as we're looping over the clauses
    // we only want to return transforms which match all clauses, i.e. each search term is ANDed
    // { transform-one:  { transform: { id: transform-one, config: {}, state: {}, ... }, count: 0 }, transform-two: {...} }
    const matches: Record<string, any> = transforms.reduce((p: Record<string, any>, c) => {
      p[c.id] = {
        transform: c,
        count: 0,
      };
      return p;
    }, {});

    clauses.forEach((c) => {
      // the search term could be negated with a minus, e.g. -bananas
      const bool = c.match === 'must';
      let ts = [];

      if (c.type === 'term') {
        // filter term based clauses, e.g. bananas
        // match on ID and description
        // if the term has been negated, AND the matches
        if (bool === true) {
          ts = transforms.filter(
            (transform) =>
              stringMatch(transform.id, c.value) === bool ||
              stringMatch(transform.config.description, c.value) === bool
          );
        } else {
          ts = transforms.filter(
            (transform) =>
              stringMatch(transform.id, c.value) === bool &&
              stringMatch(transform.config.description, c.value) === bool
          );
        }
      } else {
        // filter other clauses, i.e. the mode and status filters
        if (Array.isArray(c.value)) {
          // the status value is an array of string(s) e.g. ['failed', 'stopped']
          ts = transforms.filter((transform) =>
            (c.value as Value[]).includes(transform.stats.state)
          );
        } else {
          ts = transforms.filter((transform) => transform.mode === c.value);
        }
      }

      ts.forEach((t) => matches[t.id].count++);
    });

    // loop through the matches and return only transforms which have match all the clauses
    const filtered = Object.values(matches)
      .filter((m) => (m && m.count) >= clauses.length)
      .map((m) => m.transform);

    setFilteredTransforms(filtered);
    setIsLoading(false);
  };

  const { columns, modals: singleActionModals } = useColumns(
    expandedRowItemIds,
    setExpandedRowItemIds,
    transformSelection
  );

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

  const sorting = {
    sort: {
      field: sortField,
      direction: sortDirection,
    },
  };

  const itemIdToExpandedRowMap = getItemIdToExpandedRowMap(expandedRowItemIds, transforms);

  const pagination = {
    initialPageIndex: pageIndex,
    initialPageSize: pageSize,
    totalItemCount: transforms.length,
    pageSizeOptions: [10, 20, 50],
    hidePerPageOptions: false,
  };

  const bulkActionMenuItems = [
    <div key="startAction" className="transform__BulkActionItem">
      <EuiButtonEmpty onClick={() => bulkStartAction.openModal(transformSelection)}>
        <StartActionName items={transformSelection} />
      </EuiButtonEmpty>
    </div>,
    <div key="stopAction" className="transform__BulkActionItem">
      <EuiButtonEmpty onClick={() => stopTransforms(transformSelection)}>
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

  const renderToolsRight = () => (
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
    toolsRight: renderToolsRight(),
    onChange: onQueryChange,
    box: {
      incremental: true,
    },
    filters: [
      {
        type: 'field_value_selection' as const,
        field: 'state.state',
        name: i18n.translate('xpack.transform.statusFilter', { defaultMessage: 'Status' }),
        multiSelect: 'or' as const,
        options: Object.values(TRANSFORM_STATE).map((val) => ({
          value: val,
          name: val,
          view: getTaskStateBadge(val),
        })),
      },
      {
        type: 'field_value_selection' as const,
        field: 'mode',
        name: i18n.translate('xpack.transform.modeFilter', { defaultMessage: 'Mode' }),
        multiSelect: false,
        options: Object.values(TRANSFORM_MODE).map((val) => ({
          value: val,
          name: val,
          view: (
            <EuiBadge className="transform__TaskModeBadge" color="hollow">
              {val}
            </EuiBadge>
          ),
        })),
      },
    ],
  };

  const onTableChange = ({
    page = { index: 0, size: 10 },
    sort = { field: TRANSFORM_LIST_COLUMN.ID as string, direction: 'asc' },
  }) => {
    const { index, size } = page;
    setPageIndex(index);
    setPageSize(size);

    const { field, direction } = sort;
    setSortField(field as string);
    setSortDirection(direction as Direction);
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
