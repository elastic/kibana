/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiContextMenuItem } from '@elastic/eui';
import React, { useCallback, useMemo } from 'react';
import type { DraggableId } from 'react-beautiful-dnd';

import { isEmpty } from 'lodash';

import { FilterManager } from '@kbn/data-plugin/public';
import { useDispatch } from 'react-redux';
import { isActiveTimeline } from '../../../helpers';
import { timelineSelectors } from '../../../timelines/store/timeline';
import { useKibana } from '../../lib/kibana';
import { allowTopN } from '../drag_and_drop/helpers';
import type { ColumnHeaderOptions, DataProvider } from '../../../../common/types/timeline';
import { TimelineId } from '../../../../common/types/timeline';
import { ShowTopNButton } from './actions/show_top_n';
import { addProvider } from '../../../timelines/store/timeline/actions';
import { useDeepEqualSelector } from '../../hooks/use_selector';
export interface UseHoverActionItemsProps {
  dataProvider?: DataProvider | DataProvider[];
  dataType?: string;
  defaultFocusedButtonRef: React.MutableRefObject<HTMLButtonElement | null>;
  draggableId?: DraggableId;
  enableOverflowButton?: boolean;
  field: string;
  fieldType: string;
  isAggregatable: boolean;
  handleHoverActionClicked: () => void;
  hideAddToTimeline: boolean;
  hideFilters?: boolean;
  hideTopN: boolean;
  isCaseView: boolean;
  isObjectArray: boolean;
  isOverflowPopoverOpen?: boolean;
  itemsToShow?: number;
  onFilterAdded?: () => void;
  onOverflowButtonClick?: () => void;
  ownFocus: boolean;
  showTopN: boolean;
  stKeyboardEvent: React.KeyboardEvent<Element> | undefined;
  scopeId?: string | null;
  toggleColumn?: (column: ColumnHeaderOptions) => void;
  toggleTopN: () => void;
  values?: string[] | string | null;
}

export interface UseHoverActionItems {
  overflowActionItems: JSX.Element[];
  allActionItems: JSX.Element[];
}

export const useHoverActionItems = ({
  dataProvider,
  dataType,
  defaultFocusedButtonRef,
  draggableId,
  enableOverflowButton,
  field,
  fieldType,
  isAggregatable,
  handleHoverActionClicked,
  hideFilters,
  hideTopN,
  hideAddToTimeline,
  isCaseView,
  isObjectArray,
  isOverflowPopoverOpen,
  itemsToShow = 2,
  onFilterAdded,
  onOverflowButtonClick,
  ownFocus,
  showTopN,
  stKeyboardEvent,
  scopeId,
  toggleColumn,
  toggleTopN,
  values,
}: UseHoverActionItemsProps): UseHoverActionItems => {
  const kibana = useKibana();
  const dispatch = useDispatch();
  const { timelines, uiSettings } = kibana.services;
  // Common actions used by the alert table and alert flyout
  const {
    getAddToTimelineButton,
    getColumnToggleButton,
    getCopyButton,
    getFilterForValueButton,
    getFilterOutValueButton,
    getOverflowButton,
  } = timelines.getHoverActions();
  const filterManagerBackup = useMemo(
    () => kibana.services.data.query.filterManager,
    [kibana.services.data.query.filterManager]
  );
  const getTimeline = useMemo(() => timelineSelectors.getTimelineByIdSelector(), []);

  const activeFilterManager = useDeepEqualSelector((state) =>
    isActiveTimeline(scopeId ?? '') ? getTimeline(state, scopeId ?? '')?.filterManager : undefined
  );
  const filterManager = useMemo(
    () =>
      isActiveTimeline(scopeId ?? '')
        ? activeFilterManager ?? new FilterManager(uiSettings)
        : filterManagerBackup,
    [scopeId, activeFilterManager, uiSettings, filterManagerBackup]
  );

  /*
   *   Add to Timeline button, adds data to dataprovider but does not persists the Timeline
   *   to the server because of following reasons.
   *
   *   1. Add to Timeline button performs actions in `timelines` plugin
   *   2. `timelines` plugin does not have information on how to create/update the timelines in the server
   *       as it is owned by Security Solution
   * */
  const OnAddToTimeline = useCallback(() => {
    if (!dataProvider || isEmpty(dataProvider)) return;
    dispatch(
      addProvider({
        id: TimelineId.active,
        providers: dataProvider instanceof Array ? dataProvider : [dataProvider],
      })
    );
  }, [dataProvider, dispatch]);

  const onAddToTimelineClicked = useCallback(() => {
    if (handleHoverActionClicked) handleHoverActionClicked();
    OnAddToTimeline();
  }, [handleHoverActionClicked, OnAddToTimeline]);

  const showFilters = useMemo(() => {
    if (hideFilters) return false;
    /*
     * In the case of `DisableOverflowButton`, we show filters only when topN is NOT opened. As after topN button is clicked, the chart panel replace current hover actions in the hover actions' popover, so we have to hide all the actions.
     * in the case of `EnableOverflowButton`, we only need to hide all the items in the overflow popover as the chart's panel opens in the overflow popover, so non-overflowed actions are not affected.
     */

    return (
      values != null &&
      (enableOverflowButton || (!showTopN && !enableOverflowButton)) &&
      !isCaseView
    );
  }, [enableOverflowButton, hideFilters, isCaseView, showTopN, values]);
  const shouldDisableColumnToggle = (isObjectArray && field !== 'geo_point') || isCaseView;

  const showTopNBtn = useMemo(
    () => (
      <ShowTopNButton
        Component={enableOverflowButton ? EuiContextMenuItem : undefined}
        data-test-subj="hover-actions-show-top-n"
        enablePopOver={!enableOverflowButton && isCaseView}
        field={field}
        key="hover-actions-show-top-n"
        onClick={toggleTopN}
        onFilterAdded={onFilterAdded}
        ownFocus={ownFocus}
        showTopN={showTopN}
        showTooltip={enableOverflowButton ? false : true}
        scopeId={scopeId}
        value={values}
      />
    ),
    [
      enableOverflowButton,
      isCaseView,
      field,
      toggleTopN,
      onFilterAdded,
      ownFocus,
      showTopN,
      scopeId,
      values,
    ]
  );

  const allItems = useMemo(
    () =>
      [
        showFilters ? (
          <div data-test-subj="hover-actions-filter-for" key="hover-actions-filter-for">
            {getFilterForValueButton({
              defaultFocusedButtonRef,
              field,
              filterManager,
              keyboardEvent: stKeyboardEvent,
              onClick: handleHoverActionClicked,
              onFilterAdded,
              ownFocus,
              showTooltip: enableOverflowButton ? false : true,
              value: values,
            })}
          </div>
        ) : null,
        showFilters ? (
          <div data-test-subj="hover-actions-filter-out" key="hover-actions-filter-out">
            {getFilterOutValueButton({
              field,
              filterManager,
              keyboardEvent: stKeyboardEvent,
              onFilterAdded,
              ownFocus,
              onClick: handleHoverActionClicked,
              showTooltip: enableOverflowButton ? false : true,
              value: values,
            })}
          </div>
        ) : null,
        toggleColumn && !shouldDisableColumnToggle ? (
          <div data-test-subj="hover-actions-toggle-column" key="hover-actions-toggle-column">
            {getColumnToggleButton({
              Component: enableOverflowButton ? EuiContextMenuItem : undefined,
              field,
              isDisabled: isObjectArray && dataType !== 'geo_point',
              isObjectArray,
              keyboardEvent: stKeyboardEvent,
              ownFocus,
              onClick: handleHoverActionClicked,
              showTooltip: enableOverflowButton ? false : true,
              toggleColumn,
              value: values,
            })}
          </div>
        ) : null,
        values != null && (draggableId != null || !isEmpty(dataProvider)) && !hideAddToTimeline ? (
          <div data-test-subj="hover-actions-add-timeline" key="hover-actions-add-timeline">
            {getAddToTimelineButton({
              Component: enableOverflowButton ? EuiContextMenuItem : undefined,
              dataProvider,
              draggableId,
              field,
              keyboardEvent: stKeyboardEvent,
              ownFocus,
              onClick: onAddToTimelineClicked,
              showTooltip: enableOverflowButton ? false : true,
              value: values,
            })}
          </div>
        ) : null,
        allowTopN({
          fieldType,
          isAggregatable,
          fieldName: field,
          hideTopN,
        })
          ? showTopNBtn
          : null,
        field != null ? (
          <div data-test-subj="hover-actions-copy-button" key="hover-actions-copy-button">
            {getCopyButton({
              Component: enableOverflowButton ? EuiContextMenuItem : undefined,
              field,
              isHoverAction: true,
              keyboardEvent: stKeyboardEvent,
              ownFocus,
              onClick: handleHoverActionClicked,
              showTooltip: enableOverflowButton ? false : true,
              value: values,
            })}
          </div>
        ) : null,
      ].filter((item) => {
        return item != null;
      }),
    [
      dataProvider,
      dataType,
      defaultFocusedButtonRef,
      draggableId,
      enableOverflowButton,
      field,
      fieldType,
      isAggregatable,
      filterManager,
      getAddToTimelineButton,
      getColumnToggleButton,
      getCopyButton,
      getFilterForValueButton,
      getFilterOutValueButton,
      handleHoverActionClicked,
      onAddToTimelineClicked,
      hideAddToTimeline,
      hideTopN,
      isObjectArray,
      onFilterAdded,
      ownFocus,
      shouldDisableColumnToggle,
      showFilters,
      showTopNBtn,
      stKeyboardEvent,
      toggleColumn,
      values,
    ]
  ) as JSX.Element[];

  const overflowActionItems = useMemo(
    () =>
      [
        ...allItems.slice(0, itemsToShow),
        ...(enableOverflowButton && itemsToShow > 0 && itemsToShow < allItems.length
          ? [
              getOverflowButton({
                closePopOver: handleHoverActionClicked,
                field,
                keyboardEvent: stKeyboardEvent,
                ownFocus,
                onClick: onOverflowButtonClick,
                showTooltip: enableOverflowButton ? false : true,
                value: values,
                items: showTopN ? [showTopNBtn] : allItems.slice(itemsToShow),
                isOverflowPopoverOpen: !!isOverflowPopoverOpen,
              }),
            ]
          : []),
      ].filter((item) => {
        return item != null;
      }),
    [
      allItems,
      enableOverflowButton,
      field,
      getOverflowButton,
      handleHoverActionClicked,
      isOverflowPopoverOpen,
      itemsToShow,
      onOverflowButtonClick,
      showTopNBtn,
      ownFocus,
      showTopN,
      stKeyboardEvent,
      values,
    ]
  );

  const allActionItems = useMemo(
    () => (showTopN && !enableOverflowButton && !isCaseView ? [showTopNBtn] : allItems),
    [showTopN, enableOverflowButton, isCaseView, showTopNBtn, allItems]
  );

  return {
    overflowActionItems,
    allActionItems,
  };
};
