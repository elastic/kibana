/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { DropResult } from 'react-beautiful-dnd';
import { Dispatch } from 'redux';

import { timelineActions } from '../../store';
import { dragAndDropActions } from '../../store/local/drag_and_drop';
import { IdToDataProvider } from '../../store/local/drag_and_drop/model';

interface GetDraggableIdParams {
  dataProviderId: string;
}

export const getDraggableId = ({ dataProviderId }: GetDraggableIdParams): string =>
  `draggableId.content.${dataProviderId}`;

export const getDroppableId = ({
  visualizationPlaceholderId,
}: {
  visualizationPlaceholderId: string;
}): string => `droppableId.content.${visualizationPlaceholderId}`;

export const sourceIsContent = (result: DropResult): boolean =>
  result.source.droppableId.startsWith('droppableId.content.');

export const draggableIsContent = (result: DropResult): boolean =>
  result.draggableId.startsWith('draggableId.content.');

export const reasonIsDrop = (result: DropResult): boolean => result.reason === 'DROP';

export const destinationIsTimelineProviders = (result: DropResult): boolean =>
  result.destination != null &&
  result.destination.droppableId.startsWith('droppableId.timelineProviders');

export const getTimelineIdFromDestination = (result: DropResult): string =>
  result.destination != null &&
  result.destination.droppableId.startsWith('droppableId.timelineProviders')
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
}

export const addProviderToTimeline = ({
  dataProviders,
  result,
  dispatch,
}: AddProviderToTimelineParams): void => {
  const timeline = getTimelineIdFromDestination(result);
  const providerId = getProviderIdFromDraggable(result);
  const provider = dataProviders[providerId];

  if (provider) {
    dispatch(timelineActions.addProvider({ id: timeline, provider }));
  } else {
    dispatch(dragAndDropActions.noProviderFound({ id: providerId }));
  }
};
