/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiContextMenuItem } from '@elastic/eui';
import React, { useMemo } from 'react';
import { DraggableId } from 'react-beautiful-dnd';

import { isEmpty } from 'lodash';

import { FilterManager } from '@kbn/data-plugin/public';
import { useKibana } from '../../lib/kibana';
import { getAllFieldsByName } from '../../containers/source';
import { allowTopN } from '../drag_and_drop/helpers';
import { useDeepEqualSelector } from '../../hooks/use_selector';
import { ColumnHeaderOptions, DataProvider, TimelineId } from '../../../../common/types/timeline';
import { SourcererScopeName } from '../../store/sourcerer/model';
import { useSourcererDataView } from '../../containers/sourcerer';
import { timelineSelectors } from '../../../timelines/store/timeline';
import { ShowTopNButton } from './actions/show_top_n';

export interface UseHoverActionItemsProps {
  dataProvider?: DataProvider | DataProvider[];
  dataType?: string;
  defaultFocusedButtonRef: React.MutableRefObject<HTMLButtonElement | null>;
  draggableId?: DraggableId;
  enableOverflowButton?: boolean;
  field: string;
  handleHoverActionClicked: () => void;
  hideAddToTimeline: boolean;
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
  timelineId?: string | null;
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
  handleHoverActionClicked,
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
  timelineId,
  toggleColumn,
  toggleTopN,
  values,
}: UseHoverActionItemsProps): UseHoverActionItems => {
  const kibana = useKibana();
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
  const getManageTimeline = useMemo(() => timelineSelectors.getManageTimelineById(), []);
  const { filterManager: activeFilterManager } = useDeepEqualSelector((state) =>
    getManageTimeline(state, timelineId ?? '')
  );
  const filterManager = useMemo(
    () =>
      timelineId === TimelineId.active
        ? activeFilterManager ?? new FilterManager(uiSettings)
        : filterManagerBackup,
    [uiSettings, timelineId, activeFilterManager, filterManagerBackup]
  );

  //  Regarding data from useManageTimeline:
  //  * `indexToAdd`, which enables the alerts index to be appended to
  //    the `indexPattern` returned by `useWithSource`, may only be populated when
  //    this component is rendered in the context of the active timeline. This
  //    behavior enables the 'All events' view by appending the alerts index
  //    to the index pattern.
  const activeScope: SourcererScopeName =
    timelineId === TimelineId.active
      ? SourcererScopeName.timeline
      : timelineId != null &&
        [TimelineId.detectionsPage, TimelineId.detectionsRulesDetailsPage].includes(
          timelineId as TimelineId
        )
      ? SourcererScopeName.detections
      : SourcererScopeName.default;
  const { browserFields } = useSourcererDataView(activeScope);

  /*
   * In the case of `DisableOverflowButton`, we show filters only when topN is NOT opened. As after topN button is clicked, the chart panel replace current hover actions in the hover actions' popover, so we have to hide all the actions.
   * in the case of `EnableOverflowButton`, we only need to hide all the items in the overflow popover as the chart's panel opens in the overflow popover, so non-overflowed actions are not affected.
   */
  const showFilters =
    values != null && (enableOverflowButton || (!showTopN && !enableOverflowButton)) && !isCaseView;
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
        timelineId={timelineId}
        value={values}
      />
    ),
    [
      enableOverflowButton,
      field,
      isCaseView,
      onFilterAdded,
      ownFocus,
      showTopN,
      timelineId,
      toggleTopN,
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
              onClick: handleHoverActionClicked,
              showTooltip: enableOverflowButton ? false : true,
              value: values,
            })}
          </div>
        ) : null,
        allowTopN({
          browserField: getAllFieldsByName(browserFields)[field],
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
      browserFields,
      dataProvider,
      dataType,
      defaultFocusedButtonRef,
      draggableId,
      enableOverflowButton,
      field,
      filterManager,
      getAddToTimelineButton,
      getColumnToggleButton,
      getCopyButton,
      getFilterForValueButton,
      getFilterOutValueButton,
      handleHoverActionClicked,
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
