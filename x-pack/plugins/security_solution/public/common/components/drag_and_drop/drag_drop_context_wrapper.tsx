/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiDragDropContext } from '@elastic/eui';
import { noop } from 'lodash/fp';
import React, { useCallback } from 'react';
import { DropResult, BeforeCapture } from 'react-beautiful-dnd';
import { useDispatch } from 'react-redux';
import { Dispatch } from 'redux';

import { BrowserFields } from '../../containers/source';
import { dragAndDropModel, dragAndDropSelectors } from '../../store';
import { timelineSelectors } from '../../../timelines/store/timeline';
import { IdToDataProvider } from '../../store/drag_and_drop/model';
import { DataProvider } from '../../../timelines/components/timeline/data_providers/data_provider';
import { reArrangeProviders } from '../../../timelines/components/timeline/data_providers/helpers';
import { ADDED_TO_TIMELINE_MESSAGE } from '../../hooks/translations';
import { useAddToTimelineSensor } from '../../hooks/use_add_to_timeline';
import { displaySuccessToast, useStateToaster } from '../toasters';
import { TimelineId } from '../../../../common/types/timeline';
import {
  addFieldToTimelineColumns,
  addProviderToTimeline,
  fieldWasDroppedOnTimelineColumns,
  getTimelineIdFromColumnDroppableId,
  IS_DRAGGING_CLASS_NAME,
  IS_TIMELINE_FIELD_DRAGGING_CLASS_NAME,
  providerWasDroppedOnTimeline,
  draggableIsField,
  userIsReArrangingProviders,
} from './helpers';
import { useShallowEqualSelector, useDeepEqualSelector } from '../../hooks/use_selector';

// @ts-expect-error
window['__react-beautiful-dnd-disable-dev-warnings'] = true;

interface Props {
  browserFields: BrowserFields;
  children: React.ReactNode;
}

interface OnDragEndHandlerParams {
  activeTimelineDataProviders: DataProvider[];
  browserFields: BrowserFields;
  dataProviders: IdToDataProvider;
  dispatch: Dispatch;
  onAddedToTimeline: (fieldOrValue: string) => void;
  result: DropResult;
}

const onDragEndHandler = ({
  activeTimelineDataProviders,
  browserFields,
  dataProviders,
  dispatch,
  onAddedToTimeline,
  result,
}: OnDragEndHandlerParams) => {
  if (userIsReArrangingProviders(result)) {
    reArrangeProviders({
      dataProviders: activeTimelineDataProviders,
      destination: result.destination,
      dispatch,
      source: result.source,
      timelineId: TimelineId.active,
    });
  } else if (providerWasDroppedOnTimeline(result)) {
    addProviderToTimeline({
      activeTimelineDataProviders,
      dataProviders,
      dispatch,
      onAddedToTimeline,
      result,
      timelineId: TimelineId.active,
    });
  } else if (fieldWasDroppedOnTimelineColumns(result)) {
    addFieldToTimelineColumns({
      browserFields,
      dispatch,
      result,
      timelineId: getTimelineIdFromColumnDroppableId(result.destination?.droppableId ?? ''),
    });
  }
};

const sensors = [useAddToTimelineSensor];
const emptyDataProviders: dragAndDropModel.IdToDataProvider = {}; // stable reference
const emptyActiveTimelineDataProviders: DataProvider[] = []; // stable reference
const activeTimelineDataProvidersSelector = timelineSelectors.getTimelineByIdSelector();

/**
 * DragDropContextWrapperComponent handles all drag end events
 */
const DragDropContextWrapperComponent: React.FC<Props> = ({ browserFields, children }) => {
  const dispatch = useDispatch();
  const activeTimelineDataProviders = useShallowEqualSelector(
    (state) =>
      activeTimelineDataProvidersSelector(state, TimelineId.active)?.dataProviders ??
      emptyActiveTimelineDataProviders
  );
  const dataProviders =
    useDeepEqualSelector(dragAndDropSelectors.dataProvidersSelector) ?? emptyDataProviders;
  const [, dispatchToaster] = useStateToaster();
  const onAddedToTimeline = useCallback(
    (fieldOrValue: string) => {
      displaySuccessToast(ADDED_TO_TIMELINE_MESSAGE(fieldOrValue), dispatchToaster);
    },
    [dispatchToaster]
  );

  const onDragEnd = useCallback(
    (result: DropResult) => {
      try {
        enableScrolling();

        if (dataProviders != null) {
          onDragEndHandler({
            activeTimelineDataProviders,
            browserFields,
            dataProviders,
            dispatch,
            onAddedToTimeline,
            result,
          });
        }
      } finally {
        document.body.classList.remove(IS_DRAGGING_CLASS_NAME);

        if (draggableIsField(result)) {
          document.body.classList.remove(IS_TIMELINE_FIELD_DRAGGING_CLASS_NAME);
        }
      }
    },
    [activeTimelineDataProviders, browserFields, dataProviders, dispatch, onAddedToTimeline]
  );
  return (
    <EuiDragDropContext onDragEnd={onDragEnd} onBeforeCapture={onBeforeCapture} sensors={sensors}>
      {children}
    </EuiDragDropContext>
  );
};

DragDropContextWrapperComponent.displayName = 'DragDropContextWrapperComponent';

export const DragDropContextWrapper = React.memo(
  DragDropContextWrapperComponent,
  // prevent re-renders when data providers are added or removed, but all other props are the same
  (prevProps, nextProps) => prevProps.children === nextProps.children
);

DragDropContextWrapper.displayName = 'DragDropContextWrapper';

const onBeforeCapture = (before: BeforeCapture) => {
  if (!draggableIsField(before)) {
    document.body.classList.add(IS_DRAGGING_CLASS_NAME);
  }

  if (draggableIsField(before)) {
    document.body.classList.add(IS_TIMELINE_FIELD_DRAGGING_CLASS_NAME);
  }
};

const enableScrolling = () => (window.onscroll = () => noop);
