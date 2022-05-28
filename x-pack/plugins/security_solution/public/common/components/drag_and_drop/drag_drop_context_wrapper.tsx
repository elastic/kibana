/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { noop, pick } from 'lodash/fp';
import React, { useCallback, useMemo } from 'react';
import { DropResult, DragDropContext } from 'react-beautiful-dnd';
import { useDispatch } from 'react-redux';
import { Dispatch } from 'redux';
import deepEqual from 'fast-deep-equal';
import { IS_DRAGGING_CLASS_NAME } from '@kbn/securitysolution-t-grid';

import {
  addFieldToTimelineColumns,
  getTimelineIdFromColumnDroppableId,
} from '@kbn/timelines-plugin/public';
import { BeforeCapture } from './drag_drop_context';
import { BrowserFields } from '../../containers/source';
import { dragAndDropSelectors } from '../../store';
import { timelineSelectors } from '../../../timelines/store/timeline';
import { IdToDataProvider } from '../../store/drag_and_drop/model';
import { DataProvider } from '../../../timelines/components/timeline/data_providers/data_provider';
import { reArrangeProviders } from '../../../timelines/components/timeline/data_providers/helpers';
import {
  ADDED_TO_TIMELINE_MESSAGE,
  ADDED_TO_TIMELINE_TEMPLATE_MESSAGE,
} from '../../hooks/translations';
import { displaySuccessToast, useStateToaster } from '../toasters';
import { TimelineId, TimelineType } from '../../../../common/types/timeline';
import {
  addProviderToTimeline,
  fieldWasDroppedOnTimelineColumns,
  IS_TIMELINE_FIELD_DRAGGING_CLASS_NAME,
  providerWasDroppedOnTimeline,
  draggableIsField,
  userIsReArrangingProviders,
} from './helpers';
import { useDeepEqualSelector } from '../../hooks/use_selector';
import { useKibana } from '../../lib/kibana';
import { timelineDefaults } from '../../../timelines/store/timeline/defaults';
import { alertsHeaders } from '../alerts_viewer/default_headers';

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
      defaultsHeader: alertsHeaders,
      dispatch,
      result,
      timelineId: getTimelineIdFromColumnDroppableId(result.destination?.droppableId ?? ''),
    });
  }
};

/**
 * DragDropContextWrapperComponent handles all drag end events
 */
export const DragDropContextWrapperComponent: React.FC<Props> = ({ browserFields, children }) => {
  const dispatch = useDispatch();
  const getTimeline = useMemo(() => timelineSelectors.getTimelineByIdSelector(), []);
  const getDataProviders = useMemo(() => dragAndDropSelectors.getDataProvidersSelector(), []);
  const { timelines } = useKibana().services;
  const sensors = [timelines.getUseAddToTimelineSensor()];
  const { dataProviders: activeTimelineDataProviders, timelineType } = useDeepEqualSelector(
    (state) =>
      pick(
        ['dataProviders', 'timelineType'],
        getTimeline(state, TimelineId.active) ?? timelineDefaults
      )
  );
  const dataProviders = useDeepEqualSelector(getDataProviders);

  const [, dispatchToaster] = useStateToaster();
  const onAddedToTimeline = useCallback(
    (fieldOrValue: string) => {
      const message =
        timelineType === TimelineType.template
          ? ADDED_TO_TIMELINE_TEMPLATE_MESSAGE(fieldOrValue)
          : ADDED_TO_TIMELINE_MESSAGE(fieldOrValue);
      displaySuccessToast(message, dispatchToaster);
    },
    [dispatchToaster, timelineType]
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
    <DragDropContext onDragEnd={onDragEnd} onBeforeCapture={onBeforeCapture} sensors={sensors}>
      {children}
    </DragDropContext>
  );
};

DragDropContextWrapperComponent.displayName = 'DragDropContextWrapperComponent';

export const DragDropContextWrapper = React.memo(
  DragDropContextWrapperComponent,
  // prevent re-renders when data providers are added or removed, but all other props are the same
  (prevProps, nextProps) => deepEqual(prevProps.children, nextProps.children)
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
