/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButtonIcon, EuiToolTip } from '@elastic/eui';
import React, { useCallback, useMemo, useState, useEffect } from 'react';
import { DraggableId } from 'react-beautiful-dnd';

import { getAllFieldsByName, useWithSource } from '../../containers/source';
import { useAddToTimeline } from '../../hooks/use_add_to_timeline';
import { WithCopyToClipboard } from '../../lib/clipboard/with_copy_to_clipboard';
import { useKibana } from '../../lib/kibana';
import { createFilter } from '../add_filter_to_global_search_bar';
import { StatefulTopN } from '../top_n';

import { allowTopN } from './helpers';
import * as i18n from './translations';
import { useManageTimeline } from '../../../timelines/components/manage_timeline';
import { TimelineId } from '../../../../common/types/timeline';
import { SELECTOR_TIMELINE_BODY_CLASS_NAME } from '../../../timelines/components/timeline/styles';

interface Props {
  closePopOver?: () => void;
  draggableId?: DraggableId;
  field: string;
  goGetTimelineId?: (args: boolean) => void;
  onFilterAdded?: () => void;
  showTopN: boolean;
  timelineId?: string | null;
  toggleTopN: () => void;
  value?: string[] | string | null;
}

const DraggableWrapperHoverContentComponent: React.FC<Props> = ({
  closePopOver,
  draggableId,
  field,
  goGetTimelineId,
  onFilterAdded,
  showTopN,
  timelineId,
  toggleTopN,
  value,
}) => {
  const startDragToTimeline = useAddToTimeline({ draggableId, fieldName: field });
  const kibana = useKibana();
  const filterManagerBackup = useMemo(() => kibana.services.data.query.filterManager, [
    kibana.services.data.query.filterManager,
  ]);
  const { getManageTimelineById, getTimelineFilterManager } = useManageTimeline();

  const filterManager = useMemo(
    () =>
      timelineId === TimelineId.active
        ? getTimelineFilterManager(TimelineId.active)
        : filterManagerBackup,
    [timelineId, getTimelineFilterManager, filterManagerBackup]
  );

  //  Regarding data from useManageTimeline:
  //  * `indexToAdd`, which enables the alerts index to be appended to
  //    the `indexPattern` returned by `useWithSource`, may only be populated when
  //    this component is rendered in the context of the active timeline. This
  //    behavior enables the 'All events' view by appending the alerts index
  //    to the index pattern.
  const { indexToAdd } = useMemo(
    () =>
      timelineId === TimelineId.active
        ? getManageTimelineById(TimelineId.active)
        : { indexToAdd: null },
    [getManageTimelineById, timelineId]
  );

  const handleStartDragToTimeline = useCallback(() => {
    startDragToTimeline();
    if (closePopOver != null) {
      closePopOver();
    }
  }, [closePopOver, startDragToTimeline]);

  const filterForValue = useCallback(() => {
    const filter =
      value?.length === 0 ? createFilter(field, undefined) : createFilter(field, value);
    const activeFilterManager = filterManager;

    if (activeFilterManager != null) {
      activeFilterManager.addFilters(filter);
      if (closePopOver != null) {
        closePopOver();
      }
      if (onFilterAdded != null) {
        onFilterAdded();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [closePopOver, field, value, filterManager, onFilterAdded]);

  const filterOutValue = useCallback(() => {
    const filter =
      value?.length === 0 ? createFilter(field, null, false) : createFilter(field, value, true);
    const activeFilterManager = filterManager;

    if (activeFilterManager != null) {
      activeFilterManager.addFilters(filter);

      if (closePopOver != null) {
        closePopOver();
      }
      if (onFilterAdded != null) {
        onFilterAdded();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [closePopOver, field, value, filterManager, onFilterAdded]);

  const handleGoGetTimelineId = useCallback(() => {
    if (goGetTimelineId != null && timelineId == null) {
      goGetTimelineId(true);
    }
  }, [goGetTimelineId, timelineId]);

  const { browserFields, indexPattern } = useWithSource('default', indexToAdd);

  return (
    <>
      {!showTopN && value != null && (
        <EuiToolTip content={i18n.FILTER_FOR_VALUE}>
          <EuiButtonIcon
            aria-label={i18n.FILTER_FOR_VALUE}
            color="text"
            data-test-subj="filter-for-value"
            iconType="magnifyWithPlus"
            onClick={filterForValue}
            onMouseEnter={handleGoGetTimelineId}
          />
        </EuiToolTip>
      )}

      {!showTopN && value != null && (
        <EuiToolTip content={i18n.FILTER_OUT_VALUE}>
          <EuiButtonIcon
            aria-label={i18n.FILTER_OUT_VALUE}
            color="text"
            data-test-subj="filter-out-value"
            iconType="magnifyWithMinus"
            onClick={filterOutValue}
            onMouseEnter={handleGoGetTimelineId}
          />
        </EuiToolTip>
      )}

      {!showTopN && value != null && draggableId != null && (
        <EuiToolTip content={i18n.ADD_TO_TIMELINE}>
          <EuiButtonIcon
            aria-label={i18n.ADD_TO_TIMELINE}
            color="text"
            data-test-subj="add-to-timeline"
            iconType="timeline"
            onClick={handleStartDragToTimeline}
          />
        </EuiToolTip>
      )}

      <>
        {allowTopN({
          browserField: getAllFieldsByName(browserFields)[field],
          fieldName: field,
        }) && (
          <>
            {!showTopN && (
              <EuiToolTip content={i18n.SHOW_TOP(field)}>
                <EuiButtonIcon
                  aria-label={i18n.SHOW_TOP(field)}
                  color="text"
                  data-test-subj="show-top-field"
                  iconType="visBarVertical"
                  onClick={toggleTopN}
                  onMouseEnter={handleGoGetTimelineId}
                />
              </EuiToolTip>
            )}

            {showTopN && (
              <StatefulTopN
                browserFields={browserFields}
                field={field}
                indexPattern={indexPattern}
                indexToAdd={indexToAdd}
                onFilterAdded={onFilterAdded}
                timelineId={timelineId ?? undefined}
                toggleTopN={toggleTopN}
                value={value}
              />
            )}
          </>
        )}
      </>

      {!showTopN && (
        <EuiToolTip content={i18n.COPY_TO_CLIPBOARD}>
          <WithCopyToClipboard
            data-test-subj="copy-to-clipboard"
            text={`${field}${value != null ? `: "${value}"` : ''}`}
            titleSummary={i18n.FIELD}
          />
        </EuiToolTip>
      )}
    </>
  );
};

DraggableWrapperHoverContentComponent.displayName = 'DraggableWrapperHoverContentComponent';

export const DraggableWrapperHoverContent = React.memo(DraggableWrapperHoverContentComponent);

export const useGetTimelineId = function (
  elem: React.MutableRefObject<Element | null>,
  getTimelineId: boolean = false
) {
  const [timelineId, setTimelineId] = useState<string | null>(null);

  useEffect(() => {
    let startElem: Element | (Node & ParentNode) | null = elem.current;
    if (startElem != null && getTimelineId) {
      for (; startElem && startElem !== document; startElem = startElem.parentNode) {
        const myElem: Element = startElem as Element;
        if (
          myElem != null &&
          myElem.classList != null &&
          myElem.classList.contains(SELECTOR_TIMELINE_BODY_CLASS_NAME) &&
          myElem.hasAttribute('data-timeline-id')
        ) {
          setTimelineId(myElem.getAttribute('data-timeline-id'));
          break;
        }
      }
    }
  }, [elem, getTimelineId]);

  return timelineId;
};
