/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { DropResult } from 'react-beautiful-dnd';
import { Dispatch } from 'redux';
import { ActionCreator } from 'typescript-fsa';

import { timelineActions } from '../../store';
import { dragAndDropActions } from '../../store/local/drag_and_drop';
import { IdToDataProvider } from '../../store/local/drag_and_drop/model';

export const draggableContentPrefix = 'draggableId.content.';

export const droppableContentPrefix = 'droppableId.content.';

export const droppableTimelineProvidersPrefix = 'droppableId.timelineProviders.';

export const getDraggableId = (dataProviderId: string): string =>
  `${draggableContentPrefix}${dataProviderId}`;

export const getDroppableId = (visualizationPlaceholderId: string): string =>
  `${droppableContentPrefix}${visualizationPlaceholderId}`;

export const sourceIsContent = (result: DropResult): boolean =>
  result.source.droppableId.startsWith(droppableContentPrefix);

export const draggableIsContent = (result: DropResult): boolean =>
  result.draggableId.startsWith(draggableContentPrefix);

export const reasonIsDrop = (result: DropResult): boolean => result.reason === 'DROP';

export const destinationIsTimelineProviders = (result: DropResult): boolean =>
  result.destination != null &&
  result.destination.droppableId.startsWith(droppableTimelineProvidersPrefix);

export const getTimelineIdFromDestination = (result: DropResult): string =>
  result.destination != null &&
  result.destination.droppableId.startsWith(droppableTimelineProvidersPrefix)
    ? result.destination.droppableId.substring(result.destination.droppableId.lastIndexOf('.') + 1)
    : '';

export const getProviderIdFromDraggable = (result: DropResult): string =>
  result.draggableId.substring(result.draggableId.lastIndexOf('.') + 1);

export const providerWasDroppedOnTimeline = (result: DropResult): boolean =>
  reasonIsDrop(result) &&
  draggableIsContent(result) &&
  sourceIsContent(result) &&
  destinationIsTimelineProviders(result);

interface AddProviderToTimelineParams {
  dataProviders: IdToDataProvider;
  result: DropResult;
  dispatch: Dispatch;
  addProvider?: ActionCreator<{
    id: string;
    provider: DataProvider;
  }>;
  noProviderFound?: ActionCreator<{
    id: string;
  }>;
}

export const addProviderToTimeline = ({
  dataProviders,
  result,
  dispatch,
  addProvider = timelineActions.addProvider,
  noProviderFound = dragAndDropActions.noProviderFound,
}: AddProviderToTimelineParams): void => {
  const timeline = getTimelineIdFromDestination(result);
  const providerId = getProviderIdFromDraggable(result);
  const provider = dataProviders[providerId];

  if (provider) {
    dispatch(addProvider({ id: timeline, provider }));
  } else {
    dispatch(noProviderFound({ id: providerId }));
  }
};
