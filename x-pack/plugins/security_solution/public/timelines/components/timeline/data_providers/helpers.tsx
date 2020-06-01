/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { omit } from 'lodash/fp';
import { DraggableLocation } from 'react-beautiful-dnd';
import { Dispatch } from 'redux';

import { updateProviders } from '../../../store/timeline/actions';

import { DataProvider, DataProvidersAnd } from './data_provider';

export const omitAnd = (provider: DataProvider): DataProvidersAnd => omit('and', provider);

export const reorder = ({
  endIndex,
  group,
  startIndex,
}: {
  endIndex: number;
  group: DataProvidersAnd[];
  startIndex: number;
}): DataProvidersAnd[] => {
  const groupClone = [...group];
  const [removed] = groupClone.splice(startIndex, 1); // ⚠️ mutation
  groupClone.splice(endIndex, 0, removed); // ⚠️ mutation

  return groupClone;
};

export const move = ({
  destinationGroup,
  moveProviderFromSourceIndex,
  moveProviderToDestinationIndex,
  sourceGroup,
}: {
  destinationGroup: DataProvidersAnd[];
  moveProviderFromSourceIndex: number;
  moveProviderToDestinationIndex: number;
  sourceGroup: DataProvidersAnd[];
}): {
  updatedDestinationGroup: DataProvidersAnd[];
  updatedSourceGroup: DataProvidersAnd[];
} => {
  const sourceClone = [...sourceGroup];
  const destinationClone = [...destinationGroup];

  const [removed] = sourceClone.splice(moveProviderFromSourceIndex, 1); // ⚠️ mutation
  destinationClone.splice(moveProviderToDestinationIndex, 0, removed); // ⚠️ mutation

  const deDuplicatedDestinationGroup = destinationClone.filter((provider, i) =>
    provider.id === removed.id && i !== moveProviderToDestinationIndex ? false : true
  );

  return {
    updatedDestinationGroup: deDuplicatedDestinationGroup,
    updatedSourceGroup: sourceClone,
  };
};

export const isValidDestination = (
  destination: DraggableLocation | undefined
): destination is DraggableLocation => destination != null;

export const sourceAndDestinationAreSameDroppable = ({
  destination,
  source,
}: {
  destination: DraggableLocation;
  source: DraggableLocation;
}): boolean => source.droppableId === destination.droppableId;

export const flattenIntoAndGroups = (dataProviders: DataProvider[]): DataProvidersAnd[][] =>
  dataProviders.reduce<DataProvidersAnd[][]>(
    (acc, provider) => [...acc, [omitAnd(provider), ...provider.and]],
    []
  );

export const reArrangeProvidersInSameGroup = ({
  dataProviderGroups,
  destination,
  dispatch,
  source,
  timelineId,
}: {
  dataProviderGroups: DataProvidersAnd[][];
  destination: DraggableLocation;
  dispatch: Dispatch;
  source: DraggableLocation;
  timelineId: string;
}) => {
  const groupIndex = getGroupIndexFromDroppableId(source.droppableId);

  if (
    indexIsValid({
      index: groupIndex,
      dataProviderGroups,
    })
  ) {
    const reorderedGroup = reorder({
      group: dataProviderGroups[groupIndex],
      startIndex: source.index,
      endIndex: destination.index,
    });

    const updatedGroups = dataProviderGroups.reduce<DataProvidersAnd[][]>(
      (acc, group, i) => [...acc, i === groupIndex ? [...reorderedGroup] : [...group]],
      []
    );

    dispatch(
      updateProviders({
        id: timelineId,
        providers: unFlattenGroups(updatedGroups.filter((g) => g.length)),
      })
    );
  }
};

export const getGroupIndexFromDroppableId = (droppableId: string): number =>
  Number(droppableId.substring(droppableId.lastIndexOf('.') + 1));

export const indexIsValid = ({
  index,
  dataProviderGroups,
}: {
  index: number;
  dataProviderGroups: DataProvidersAnd[][];
}): boolean => index >= 0 && index < dataProviderGroups.length;

export const convertDataProviderAnd = (dataProvidersAnd: DataProvidersAnd): DataProvider => ({
  ...dataProvidersAnd,
  and: [],
});

export const unFlattenGroups = (groups: DataProvidersAnd[][]): DataProvider[] =>
  groups.reduce<DataProvider[]>((acc, group) => [...acc, { ...group[0], and: group.slice(1) }], []);

export const moveProvidersBetweenGroups = ({
  dataProviderGroups,
  destination,
  dispatch,
  source,
  timelineId,
}: {
  dataProviderGroups: DataProvidersAnd[][];
  destination: DraggableLocation;
  dispatch: Dispatch;
  source: DraggableLocation;
  timelineId: string;
}) => {
  const sourceGroupIndex = getGroupIndexFromDroppableId(source.droppableId);
  const destinationGroupIndex = getGroupIndexFromDroppableId(destination.droppableId);

  if (
    indexIsValid({
      index: sourceGroupIndex,
      dataProviderGroups,
    }) &&
    indexIsValid({
      index: destinationGroupIndex,
      dataProviderGroups,
    })
  ) {
    const sourceGroup = dataProviderGroups[sourceGroupIndex];
    const destinationGroup = dataProviderGroups[destinationGroupIndex];
    const moveProviderFromSourceIndex = source.index;
    const moveProviderToDestinationIndex = destination.index;

    const { updatedDestinationGroup, updatedSourceGroup } = move({
      destinationGroup,
      moveProviderFromSourceIndex,
      moveProviderToDestinationIndex,
      sourceGroup,
    });

    const updatedGroups = dataProviderGroups.reduce<DataProvidersAnd[][]>(
      (acc, group, i) => [
        ...acc,
        i === sourceGroupIndex
          ? [...updatedSourceGroup]
          : i === destinationGroupIndex
          ? [...updatedDestinationGroup]
          : [...group],
      ],
      []
    );

    dispatch(
      updateProviders({
        id: timelineId,
        providers: unFlattenGroups(updatedGroups.filter((g) => g.length)),
      })
    );
  }
};

export const addProviderToEmptyTimeline = ({
  dispatch,
  onAddedToTimeline,
  providerToAdd,
  timelineId,
}: {
  dispatch: Dispatch;
  onAddedToTimeline: (fieldOrValue: string) => void;
  providerToAdd: DataProvider;
  timelineId: string;
}) => {
  dispatch(
    updateProviders({
      id: timelineId,
      providers: [providerToAdd],
    })
  );

  onAddedToTimeline(providerToAdd.name);
};

/** Rendered as a constant drop target for creating a new OR group */
export const EMPTY_GROUP: DataProvidersAnd[][] = [[]];

export const reArrangeProviders = ({
  dataProviders,
  destination,
  dispatch,
  source,
  timelineId,
}: {
  dataProviders: DataProvider[];
  destination: DraggableLocation | undefined;
  dispatch: Dispatch;
  source: DraggableLocation;
  timelineId: string;
}) => {
  if (!isValidDestination(destination)) {
    return;
  }

  const dataProviderGroups = [...flattenIntoAndGroups(dataProviders), ...EMPTY_GROUP];

  if (sourceAndDestinationAreSameDroppable({ source, destination })) {
    reArrangeProvidersInSameGroup({
      dataProviderGroups,
      destination,
      dispatch,
      source,
      timelineId,
    });
  } else {
    moveProvidersBetweenGroups({
      dataProviderGroups,
      destination,
      dispatch,
      source,
      timelineId,
    });
  }
};

export const addProviderToGroup = ({
  dataProviders,
  destination,
  dispatch,
  onAddedToTimeline,
  providerToAdd,
  timelineId,
}: {
  dataProviders: DataProvider[];
  destination: DraggableLocation | undefined;
  dispatch: Dispatch;
  onAddedToTimeline: (fieldOrValue: string) => void;
  providerToAdd: DataProvider;
  timelineId: string;
}) => {
  const dataProviderGroups = [...flattenIntoAndGroups(dataProviders), ...EMPTY_GROUP];

  if (!isValidDestination(destination)) {
    return;
  }

  const destinationGroupIndex = getGroupIndexFromDroppableId(destination.droppableId);
  if (
    indexIsValid({
      index: destinationGroupIndex,
      dataProviderGroups,
    })
  ) {
    const destinationGroup = dataProviderGroups[destinationGroupIndex];
    const destinationClone = [...destinationGroup];
    destinationClone.splice(destination.index, 0, omitAnd(providerToAdd)); // ⚠️ mutation
    const deDuplicatedGroup = destinationClone.filter((provider, i) =>
      provider.id === providerToAdd.id && i !== destination.index ? false : true
    );

    const updatedGroups = dataProviderGroups.reduce<DataProvidersAnd[][]>(
      (acc, group, i) => [
        ...acc,
        i === destinationGroupIndex ? [...deDuplicatedGroup] : [...group],
      ],
      []
    );

    dispatch(
      updateProviders({
        id: timelineId,
        providers: unFlattenGroups(updatedGroups.filter((g) => g.length)),
      })
    );
    onAddedToTimeline(providerToAdd.name);
  }
};

export const addContentToTimeline = ({
  dataProviders,
  destination,
  dispatch,
  onAddedToTimeline,
  providerToAdd,
  timelineId,
}: {
  dataProviders: DataProvider[];
  destination: DraggableLocation | undefined;
  dispatch: Dispatch;
  onAddedToTimeline: (fieldOrValue: string) => void;
  providerToAdd: DataProvider;
  timelineId: string;
}) => {
  if (dataProviders.length === 0) {
    addProviderToEmptyTimeline({ dispatch, onAddedToTimeline, providerToAdd, timelineId });
  } else {
    addProviderToGroup({
      dataProviders,
      destination,
      dispatch,
      onAddedToTimeline,
      providerToAdd,
      timelineId,
    });
  }
};
