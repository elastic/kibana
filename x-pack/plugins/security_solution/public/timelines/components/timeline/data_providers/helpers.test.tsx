/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { DataProvider, DataProvidersAnd } from './data_provider';
import {
  addContentToTimeline,
  addProviderToGroup,
  addProviderToEmptyTimeline,
  convertDataProviderAnd,
  flattenIntoAndGroups,
  getGroupIndexFromDroppableId,
  indexIsValid,
  isValidDestination,
  move,
  moveProvidersBetweenGroups,
  omitAnd,
  reArrangeProviders,
  reArrangeProvidersInSameGroup,
  reorder,
  sourceAndDestinationAreSameDroppable,
  unFlattenGroups,
} from './helpers';
import {
  providerA,
  providerB,
  providerC,
  providerD,
  providerE,
  providerF,
  twoGroups,
} from './mock/mock_and_providers';

const timelineId = 'timeline-1';

describe('helpers', () => {
  describe('omitAnd', () => {
    test('it removes the `and` property', () => {
      const dataProvider: DataProvider = {
        ...providerA,
        and: [], // this will be removed
      };

      expect(omitAnd(dataProvider)).toEqual(providerA);
    });
  });

  describe('reorder', () => {
    test('it returns the expected group when moving the 1st entry to the 2nd entry', () => {
      expect(
        reorder({ group: [providerA, providerB, providerC], startIndex: 0, endIndex: 1 })
      ).toEqual([providerB, providerA, providerC]);
    });

    test('it returns the expected group when moving the 1st entry to the 3rd entry', () => {
      expect(
        reorder({ group: [providerA, providerB, providerC], startIndex: 0, endIndex: 2 })
      ).toEqual([providerB, providerC, providerA]);
    });

    test('it returns the expected group when moving the 2nd entry to the 1st entry', () => {
      expect(
        reorder({ group: [providerA, providerB, providerC], startIndex: 1, endIndex: 0 })
      ).toEqual([providerB, providerA, providerC]);
    });

    test('it returns the expected group when moving the 2nd entry to the 3rd entry', () => {
      expect(
        reorder({ group: [providerA, providerB, providerC], startIndex: 1, endIndex: 2 })
      ).toEqual([providerA, providerC, providerB]);
    });

    test('it returns the expected group when moving the 3rd entry to the 1st entry', () => {
      expect(
        reorder({ group: [providerA, providerB, providerC], startIndex: 2, endIndex: 0 })
      ).toEqual([providerC, providerA, providerB]);
    });

    test('it returns the expected group when moving the 3rd entry to the 2nd entry', () => {
      expect(
        reorder({ group: [providerA, providerB, providerC], startIndex: 2, endIndex: 1 })
      ).toEqual([providerA, providerC, providerB]);
    });

    test('it returns the same order when start/end index are the same', () => {
      expect(
        reorder({ group: [providerA, providerB, providerC], startIndex: 0, endIndex: 0 })
      ).toEqual([providerA, providerB, providerC]);
    });

    test('it returns a new array reference when start/end index are the same', () => {
      const group = [providerA, providerB, providerC];

      expect(reorder({ group, startIndex: 0, endIndex: 0 }) === group).toBe(false);
    });
  });

  describe('move', () => {
    [0, 1, 2].forEach((moveProviderFromSourceIndex) =>
      test(`it moves moveProviderFromSourceIndex ${moveProviderFromSourceIndex} to an empty group`, () => {
        const sourceGroup = [providerA, providerB, providerC];
        const destinationGroup: DataProvidersAnd[] = []; // destination is always empty

        expect(
          move({
            destinationGroup,
            moveProviderFromSourceIndex,
            moveProviderToDestinationIndex: 0,
            sourceGroup,
          })
        ).toEqual({
          updatedDestinationGroup: [sourceGroup[moveProviderFromSourceIndex]],
          updatedSourceGroup: sourceGroup.filter((_, i) => i !== moveProviderFromSourceIndex),
        });
      })
    );

    [0, 1, 2].forEach((moveProviderFromSourceIndex) =>
      [0, 1, 2].forEach((moveProviderToDestinationIndex) =>
        test(`it moves moveProviderFromSourceIndex ${moveProviderFromSourceIndex} to moveProviderToDestinationIndex ${moveProviderToDestinationIndex} (no duplicates in destination)`, () => {
          const sourceGroup = [providerA, providerB, providerC];
          const destinationGroup: DataProvidersAnd[] = [providerD, providerE, providerF]; // destination has no duplicates

          expect(
            move({
              destinationGroup,
              moveProviderFromSourceIndex,
              moveProviderToDestinationIndex,
              sourceGroup,
            })
          ).toEqual({
            updatedDestinationGroup: destinationGroup.reduce<DataProvidersAnd[]>(
              (acc, p, i) =>
                i !== moveProviderToDestinationIndex
                  ? [...acc, p]
                  : [...acc, sourceGroup[moveProviderFromSourceIndex], p],
              []
            ),
            updatedSourceGroup: sourceGroup.filter((_, i) => i !== moveProviderFromSourceIndex),
          });
        })
      )
    );

    [0, 1, 2].forEach((moveProviderFromSourceIndex) =>
      [0, 1, 2].forEach((moveProviderToDestinationIndex) =>
        test(`it moves moveProviderFromSourceIndex ${moveProviderFromSourceIndex} to moveProviderToDestinationIndex ${moveProviderToDestinationIndex} (with duplicates in destination)`, () => {
          const sourceGroup = [providerA, providerB, providerC];
          const destinationGroup: DataProvidersAnd[] = [providerA, providerB, providerC]; // destination has duplicates

          expect(
            move({
              destinationGroup,
              moveProviderFromSourceIndex,
              moveProviderToDestinationIndex,
              sourceGroup,
            })
          ).toEqual({
            updatedDestinationGroup: destinationGroup
              .reduce<DataProvidersAnd[]>(
                (acc, p, i) =>
                  i !== moveProviderToDestinationIndex
                    ? [...acc, p]
                    : [...acc, sourceGroup[moveProviderFromSourceIndex], p],
                []
              )
              .filter(
                (p, i) =>
                  p.id !== sourceGroup[moveProviderFromSourceIndex].id ||
                  i === moveProviderToDestinationIndex
              ),
            updatedSourceGroup: sourceGroup.filter((_, i) => i !== moveProviderFromSourceIndex),
          });
        })
      )
    );
  });

  describe('isValidDestination', () => {
    test('it returns false when destination is undefined', () => {
      expect(isValidDestination(undefined)).toBe(false);
    });

    test('it returns true when the type guard matches as DraggableLocation ', () => {
      const location = { droppableId: 'id', index: 0 };
      expect(isValidDestination(location)).toBe(true);
    });
  });

  describe('sourceAndDestinationAreSameDroppable', () => {
    test('it returns false when the source and destination `droppableId`s are different', () => {
      expect(
        sourceAndDestinationAreSameDroppable({
          source: { droppableId: 'id1', index: 0 },
          destination: { droppableId: 'id2', index: 0 },
        })
      ).toBe(false);
    });

    test('it returns true when the source and destination `droppableId`s are the same', () => {
      expect(
        sourceAndDestinationAreSameDroppable({
          source: { droppableId: 'id1', index: 0 },
          destination: { droppableId: 'id1', index: 0 },
        })
      ).toBe(true);
    });
  });

  describe('flattenIntoAndGroups', () => {
    test('it flattens a collection of data provider into the expected groups', () => {
      expect(flattenIntoAndGroups(twoGroups)).toEqual([
        [
          {
            enabled: true,
            excluded: false,
            id: 'context-field.name-a',
            kqlQuery: '',
            name: 'a',
            queryMatch: { field: 'field.name', operator: ':', value: 'a' },
          },
          {
            enabled: true,
            excluded: false,
            id: 'context-field.name-b',
            kqlQuery: '',
            name: 'b',
            queryMatch: { field: 'field.name', operator: ':', value: 'b' },
          },
          {
            enabled: true,
            excluded: false,
            id: 'context-field.name-c',
            kqlQuery: '',
            name: 'c',
            queryMatch: { field: 'field.name', operator: ':', value: 'c' },
          },
        ],
        [
          {
            enabled: true,
            excluded: false,
            id: 'context-field.name-d',
            kqlQuery: '',
            name: 'd',
            queryMatch: { field: 'field.name', operator: ':', value: 'd' },
          },
          {
            enabled: true,
            excluded: false,
            id: 'context-field.name-e',
            kqlQuery: '',
            name: 'e',
            queryMatch: { field: 'field.name', operator: ':', value: 'e' },
          },
          {
            enabled: true,
            excluded: false,
            id: 'context-field.name-f',
            kqlQuery: '',
            name: 'f',
            queryMatch: { field: 'field.name', operator: ':', value: 'f' },
          },
        ],
      ]);
    });

    test('it flattens an empty collection', () => {
      expect(flattenIntoAndGroups([])).toEqual([]);
    });
  });

  describe('reArrangeProvidersInSameGroup', () => {
    const dataProviderGroups: DataProvidersAnd[][] = [
      [providerA, providerB, providerC],
      [providerD, providerE, providerF],
      [], // <-- this empty group will be filtered-out by `reArrangeProvidersInSameGroup`
    ];
    const destination = {
      droppableId: 'droppableId.timelineProviders.timeline-1.group.0',
      index: 1,
    };
    const source = {
      index: 0,
      droppableId: 'droppableId.timelineProviders.timeline-1.group.0',
    };

    test('it dispatches an `updateProviders` action with the expected re-ordered group', () => {
      const dispatch = jest.fn();

      reArrangeProvidersInSameGroup({
        dataProviderGroups,
        destination,
        dispatch,
        source,
        timelineId,
      });

      expect(dispatch).toBeCalledWith({
        payload: {
          id: 'timeline-1',
          providers: [
            {
              and: [
                {
                  enabled: true,
                  excluded: false,
                  id: 'context-field.name-a',
                  kqlQuery: '',
                  name: 'a',
                  queryMatch: { field: 'field.name', operator: ':', value: 'a' },
                },
                {
                  enabled: true,
                  excluded: false,
                  id: 'context-field.name-c',
                  kqlQuery: '',
                  name: 'c',
                  queryMatch: { field: 'field.name', operator: ':', value: 'c' },
                },
              ],
              enabled: true,
              excluded: false,
              id: 'context-field.name-b',
              kqlQuery: '',
              name: 'b',
              queryMatch: { field: 'field.name', operator: ':', value: 'b' },
            },
            {
              and: [
                {
                  enabled: true,
                  excluded: false,
                  id: 'context-field.name-e',
                  kqlQuery: '',
                  name: 'e',
                  queryMatch: { field: 'field.name', operator: ':', value: 'e' },
                },
                {
                  enabled: true,
                  excluded: false,
                  id: 'context-field.name-f',
                  kqlQuery: '',
                  name: 'f',
                  queryMatch: { field: 'field.name', operator: ':', value: 'f' },
                },
              ],
              enabled: true,
              excluded: false,
              id: 'context-field.name-d',
              kqlQuery: '',
              name: 'd',
              queryMatch: { field: 'field.name', operator: ':', value: 'd' },
            },
          ],
        },
        type: 'x-pack/security_solution/local/timeline/UPDATE_PROVIDERS',
      });
    });

    test('it does NOT dispatch an action if the group index from the source droppableId is invalid', () => {
      const dispatch = jest.fn();

      reArrangeProvidersInSameGroup({
        dataProviderGroups,
        destination,
        dispatch,
        source: {
          index: 0,
          droppableId: 'droppableId.timelineProviders.timeline-1.group.1234', // <-- 1234 is an invalid group index
        },
        timelineId,
      });

      expect(dispatch).not.toBeCalled();
    });
  });

  describe('getGroupIndexFromDroppableId', () => {
    const droppableId = 'droppableId.timelineProviders.timeline-1.group.1';

    test('it returns the expected group index', () => {
      expect(getGroupIndexFromDroppableId(droppableId)).toEqual(1);
    });
  });

  describe('indexIsValid', () => {
    test('it returns true when `index` is 0 and `dataProviderGroups` has one group', () => {
      expect(
        indexIsValid({ index: 0, dataProviderGroups: [[providerA, providerB, providerC]] })
      ).toBe(true);
    });

    test('it returns false when `index` less than 0 and `dataProviderGroups` has one group', () => {
      expect(
        indexIsValid({ index: -1, dataProviderGroups: [[providerA, providerB, providerC]] })
      ).toBe(false);
    });

    test('it returns false when `index` greater than zero and `dataProviderGroups` has one group', () => {
      expect(
        indexIsValid({ index: 1, dataProviderGroups: [[providerA, providerB, providerC]] })
      ).toBe(false);
    });

    test('it returns false when `index` is 0 and `dataProviderGroups` is empty', () => {
      expect(indexIsValid({ index: 0, dataProviderGroups: [] })).toBe(false);
    });

    test('it returns false when `index` greater than zero and `dataProviderGroups` is empty', () => {
      expect(indexIsValid({ index: 1, dataProviderGroups: [[]] })).toBe(false);
    });
  });

  describe('convertDataProviderAnd', () => {
    test('it converts a DataProvidersAnd to a DataProvider', () => {
      expect(convertDataProviderAnd(providerA)).toEqual({ ...providerA, and: [] });
    });
  });

  describe('unFlattenGroups', () => {
    test('it un-flattens groups into the expected collection of `DataProvider`s', () => {
      expect(
        unFlattenGroups([
          [providerA, providerB, providerC],
          [providerD, providerE, providerF],
        ])
      ).toEqual(twoGroups);
    });
  });

  describe('moveProvidersBetweenGroups', () => {
    [0, 1, 2].forEach((moveProviderFromSourceIndex) =>
      test(`it dispatches the expected action when moving from moveProviderFromSourceIndex ${moveProviderFromSourceIndex} to an empty group`, () => {
        const dataProviderGroups: DataProvidersAnd[][] = [[providerA, providerB, providerC], []];
        const destination = {
          droppableId: 'droppableId.timelineProviders.timeline-1.group.1',
          index: 0,
        };
        const dispatch = jest.fn();
        const source = {
          droppableId: 'droppableId.timelineProviders.timeline-1.group.0',
          index: moveProviderFromSourceIndex,
        };

        moveProvidersBetweenGroups({
          dataProviderGroups,
          destination,
          dispatch,
          source,
          timelineId,
        });

        expect(dispatch).toBeCalledWith({
          payload: {
            id: 'timeline-1',
            providers: unFlattenGroups([
              dataProviderGroups[0].filter((_, i) => i !== moveProviderFromSourceIndex),
              [dataProviderGroups[0][moveProviderFromSourceIndex]],
            ]),
          },
          type: 'x-pack/security_solution/local/timeline/UPDATE_PROVIDERS',
        });
      })
    );

    [0, 1, 2].forEach((moveProviderFromSourceIndex) =>
      [0, 1, 2].forEach((moveProviderToDestinationIndex) =>
        test(`it dispatches the expected action when moving from moveProviderFromSourceIndex ${moveProviderFromSourceIndex} to moveProviderToDestinationIndex ${moveProviderToDestinationIndex} (no duplicates in destination)`, () => {
          const dataProviderGroups: DataProvidersAnd[][] = [
            [providerA, providerB, providerC],
            [providerD, providerE, providerF],
            [], // <-- this empty group will be removed
          ];
          const destination = {
            droppableId: 'droppableId.timelineProviders.timeline-1.group.1',
            index: moveProviderToDestinationIndex,
          };
          const dispatch = jest.fn();
          const source = {
            droppableId: 'droppableId.timelineProviders.timeline-1.group.0',
            index: moveProviderFromSourceIndex,
          };

          moveProvidersBetweenGroups({
            dataProviderGroups,
            destination,
            dispatch,
            source,
            timelineId,
          });

          expect(dispatch).toBeCalledWith({
            payload: {
              id: 'timeline-1',
              providers: unFlattenGroups([
                dataProviderGroups[0].filter((_, i) => i !== moveProviderFromSourceIndex),
                dataProviderGroups[1].reduce<DataProvidersAnd[]>(
                  (acc, p, i) =>
                    i === moveProviderToDestinationIndex
                      ? [...acc, dataProviderGroups[0][moveProviderFromSourceIndex], p]
                      : [...acc, p],
                  []
                ),
              ]),
            },
            type: 'x-pack/security_solution/local/timeline/UPDATE_PROVIDERS',
          });
        })
      )
    );

    [0, 1, 2].forEach((moveProviderFromSourceIndex) =>
      [0, 1, 2].forEach((moveProviderToDestinationIndex) =>
        test(`it dispatches the expected action when moving from moveProviderFromSourceIndex ${moveProviderFromSourceIndex} to moveProviderToDestinationIndex ${moveProviderToDestinationIndex} (with duplicates in destination)`, () => {
          const dataProviderGroups: DataProvidersAnd[][] = [
            [providerA, providerB, providerC],
            [providerA, providerB, providerC],
            [], // <-- this empty group will be removed
          ];
          const destination = {
            droppableId: 'droppableId.timelineProviders.timeline-1.group.1',
            index: moveProviderToDestinationIndex,
          };
          const dispatch = jest.fn();
          const source = {
            droppableId: 'droppableId.timelineProviders.timeline-1.group.0',
            index: moveProviderFromSourceIndex,
          };

          moveProvidersBetweenGroups({
            dataProviderGroups,
            destination,
            dispatch,
            source,
            timelineId,
          });

          expect(dispatch).toBeCalledWith({
            payload: {
              id: 'timeline-1',
              providers: unFlattenGroups([
                dataProviderGroups[0].filter((_, i) => i !== moveProviderFromSourceIndex),
                dataProviderGroups[1]
                  .reduce<DataProvidersAnd[]>(
                    (acc, p, i) =>
                      i !== moveProviderToDestinationIndex
                        ? [...acc, p]
                        : [...acc, dataProviderGroups[0][moveProviderFromSourceIndex], p],
                    []
                  )
                  .filter(
                    (p, i) =>
                      p.id !== dataProviderGroups[0][moveProviderFromSourceIndex].id ||
                      i === moveProviderToDestinationIndex
                  ),
              ]),
            },
            type: 'x-pack/security_solution/local/timeline/UPDATE_PROVIDERS',
          });
        })
      )
    );

    test('it does NOT dispatch an action when the sourceGroupIndex is invalid', () => {
      const dataProviderGroups: DataProvidersAnd[][] = [[providerA, providerB, providerC], []];
      const destination = {
        droppableId: 'droppableId.timelineProviders.timeline-1.group.1',
        index: 0,
      };
      const dispatch = jest.fn();
      const source = {
        droppableId: 'droppableId.timelineProviders.timeline-1.group.1234', // <-- invalid sourceGroupIndex
        index: 0,
      };

      moveProvidersBetweenGroups({
        dataProviderGroups,
        destination,
        dispatch,
        source,
        timelineId,
      });

      expect(dispatch).not.toBeCalled();
    });

    test('it does NOT dispatch an action when the destinationGroupIndex is invalid', () => {
      const dataProviderGroups: DataProvidersAnd[][] = [[providerA, providerB, providerC], []];
      const destination = {
        droppableId: 'droppableId.timelineProviders.timeline-1.group.1234', // <-- invalid destinationGroupIndex
        index: 0,
      };
      const dispatch = jest.fn();
      const source = {
        droppableId: 'droppableId.timelineProviders.timeline-1.group.0',
        index: 0,
      };

      moveProvidersBetweenGroups({
        dataProviderGroups,
        destination,
        dispatch,
        source,
        timelineId,
      });

      expect(dispatch).not.toBeCalled();
    });
  });

  describe('addProviderToEmptyTimeline', () => {
    test('it dispatches the expected action', () => {
      const dispatch = jest.fn();
      const onAddedToTimeline = jest.fn();
      const providerToAdd = { ...providerA, and: [] };

      addProviderToEmptyTimeline({
        dispatch,
        onAddedToTimeline,
        providerToAdd,
        timelineId,
      });

      expect(dispatch).toBeCalledWith({
        payload: {
          id: 'timeline-1',
          providers: [
            {
              and: [],
              enabled: true,
              excluded: false,
              id: 'context-field.name-a',
              kqlQuery: '',
              name: 'a',
              queryMatch: { field: 'field.name', operator: ':', value: 'a' },
            },
          ],
        },
        type: 'x-pack/security_solution/local/timeline/UPDATE_PROVIDERS',
      });
    });

    test('it invokes onAddedToTimeline with the name of the provider', () => {
      const dispatch = jest.fn();
      const onAddedToTimeline = jest.fn();
      const providerToAdd = { ...providerA, and: [] };

      addProviderToEmptyTimeline({
        dispatch,
        onAddedToTimeline,
        providerToAdd,
        timelineId,
      });

      expect(onAddedToTimeline).toBeCalledWith(providerToAdd.name);
    });
  });

  describe('reArrangeProviders', () => {
    test('it does NOT dispatch an action when destination is invalid', () => {
      const destination = {
        droppableId: 'droppableId.timelineProviders.timeline-1.group.1234', // <-- invalid destination group
        index: 1,
      };
      const dispatch = jest.fn();
      const source = {
        index: 0,
        droppableId: 'droppableId.timelineProviders.timeline-1.group.0',
      };

      reArrangeProviders({
        dataProviders: twoGroups,
        destination,
        dispatch,
        source,
        timelineId,
      });

      expect(dispatch).not.toBeCalled();
    });

    test('it dispatches the expected action when dragging within the same group', () => {
      const destination = {
        droppableId: 'droppableId.timelineProviders.timeline-1.group.0',
        index: 1,
      };
      const dispatch = jest.fn();
      const source = {
        index: 0,
        droppableId: 'droppableId.timelineProviders.timeline-1.group.0',
      };

      reArrangeProviders({
        dataProviders: twoGroups,
        destination,
        dispatch,
        source,
        timelineId,
      });

      expect(dispatch).toBeCalledWith({
        payload: {
          id: 'timeline-1',
          providers: [
            {
              and: [
                {
                  enabled: true,
                  excluded: false,
                  id: 'context-field.name-a',
                  kqlQuery: '',
                  name: 'a',
                  queryMatch: { field: 'field.name', operator: ':', value: 'a' },
                },
                {
                  enabled: true,
                  excluded: false,
                  id: 'context-field.name-c',
                  kqlQuery: '',
                  name: 'c',
                  queryMatch: { field: 'field.name', operator: ':', value: 'c' },
                },
              ],
              enabled: true,
              excluded: false,
              id: 'context-field.name-b',
              kqlQuery: '',
              name: 'b',
              queryMatch: { field: 'field.name', operator: ':', value: 'b' },
            },
            {
              and: [
                {
                  enabled: true,
                  excluded: false,
                  id: 'context-field.name-e',
                  kqlQuery: '',
                  name: 'e',
                  queryMatch: { field: 'field.name', operator: ':', value: 'e' },
                },
                {
                  enabled: true,
                  excluded: false,
                  id: 'context-field.name-f',
                  kqlQuery: '',
                  name: 'f',
                  queryMatch: { field: 'field.name', operator: ':', value: 'f' },
                },
              ],
              enabled: true,
              excluded: false,
              id: 'context-field.name-d',
              kqlQuery: '',
              name: 'd',
              queryMatch: { field: 'field.name', operator: ':', value: 'd' },
            },
          ],
        },
        type: 'x-pack/security_solution/local/timeline/UPDATE_PROVIDERS',
      });
    });

    test('it dispatches the expected action when dragging between groups', () => {
      const destination = {
        droppableId: 'droppableId.timelineProviders.timeline-1.group.1',
        index: 0,
      };
      const dispatch = jest.fn();
      const source = {
        index: 0,
        droppableId: 'droppableId.timelineProviders.timeline-1.group.0',
      };

      reArrangeProviders({
        dataProviders: twoGroups,
        destination,
        dispatch,
        source,
        timelineId,
      });

      expect(dispatch).toBeCalledWith({
        payload: {
          id: 'timeline-1',
          providers: [
            {
              and: [
                {
                  enabled: true,
                  excluded: false,
                  id: 'context-field.name-c',
                  kqlQuery: '',
                  name: 'c',
                  queryMatch: { field: 'field.name', operator: ':', value: 'c' },
                },
              ],
              enabled: true,
              excluded: false,
              id: 'context-field.name-b',
              kqlQuery: '',
              name: 'b',
              queryMatch: { field: 'field.name', operator: ':', value: 'b' },
            },
            {
              and: [
                {
                  enabled: true,
                  excluded: false,
                  id: 'context-field.name-d',
                  kqlQuery: '',
                  name: 'd',
                  queryMatch: { field: 'field.name', operator: ':', value: 'd' },
                },
                {
                  enabled: true,
                  excluded: false,
                  id: 'context-field.name-e',
                  kqlQuery: '',
                  name: 'e',
                  queryMatch: { field: 'field.name', operator: ':', value: 'e' },
                },
                {
                  enabled: true,
                  excluded: false,
                  id: 'context-field.name-f',
                  kqlQuery: '',
                  name: 'f',
                  queryMatch: { field: 'field.name', operator: ':', value: 'f' },
                },
              ],
              enabled: true,
              excluded: false,
              id: 'context-field.name-a',
              kqlQuery: '',
              name: 'a',
              queryMatch: { field: 'field.name', operator: ':', value: 'a' },
            },
          ],
        },
        type: 'x-pack/security_solution/local/timeline/UPDATE_PROVIDERS',
      });
    });
  });

  describe('addProviderToGroup', () => {
    const dataProviders = [{ ...providerA, and: [] }];
    const destination = {
      droppableId: 'droppableId.timelineProviders.timeline-1.group.0',
      index: 0,
    };
    const providerToAdd = { ...providerB, and: [] };

    test('it does NOT dispatch an action when destination is undefined', () => {
      const dispatch = jest.fn();
      const onAddedToTimeline = jest.fn();

      addProviderToGroup({
        dataProviders,
        destination: undefined,
        dispatch,
        onAddedToTimeline,
        providerToAdd,
        timelineId,
      });

      expect(dispatch).not.toBeCalled();
    });

    test('it does NOT invoke onAddedToTimeline when destination undefined', () => {
      const dispatch = jest.fn();
      const onAddedToTimeline = jest.fn();

      addProviderToGroup({
        dataProviders,
        destination: undefined,
        dispatch,
        onAddedToTimeline,
        providerToAdd,
        timelineId,
      });

      expect(onAddedToTimeline).not.toBeCalled();
    });

    test('it does NOT dispatch an action when destination is invalid', () => {
      const dispatch = jest.fn();
      const onAddedToTimeline = jest.fn();

      addProviderToGroup({
        dataProviders,
        destination: {
          droppableId: 'droppableId.timelineProviders.timeline-1.group.1234', // <-- invalid group
          index: 0,
        },
        dispatch,
        onAddedToTimeline,
        providerToAdd,
        timelineId,
      });

      expect(dispatch).not.toBeCalled();
    });

    test('it does NOT invoke onAddedToTimeline when destination is invalid', () => {
      const dispatch = jest.fn();
      const onAddedToTimeline = jest.fn();

      addProviderToGroup({
        dataProviders,
        destination: {
          droppableId: 'droppableId.timelineProviders.timeline-1.group.1234', // <-- invalid group
          index: 0,
        },
        dispatch,
        onAddedToTimeline,
        providerToAdd,
        timelineId,
      });

      expect(onAddedToTimeline).not.toBeCalled();
    });

    test('it dispatches the UPDATE_PROVIDERS action with the expected values', () => {
      const dispatch = jest.fn();
      const onAddedToTimeline = jest.fn();

      addProviderToGroup({
        dataProviders,
        destination,
        dispatch,
        onAddedToTimeline,
        providerToAdd,
        timelineId,
      });

      expect(dispatch).toBeCalledWith({
        payload: {
          id: 'timeline-1',
          providers: [
            {
              and: [
                {
                  enabled: true,
                  excluded: false,
                  id: 'context-field.name-a',
                  kqlQuery: '',
                  name: 'a',
                  queryMatch: { field: 'field.name', operator: ':', value: 'a' },
                },
              ],
              enabled: true,
              excluded: false,
              id: 'context-field.name-b',
              kqlQuery: '',
              name: 'b',
              queryMatch: { field: 'field.name', operator: ':', value: 'b' },
            },
          ],
        },
        type: 'x-pack/security_solution/local/timeline/UPDATE_PROVIDERS',
      });
    });

    test('it invokes onAddedToTimeline with the expected provider name', () => {
      const dispatch = jest.fn();
      const onAddedToTimeline = jest.fn();

      addProviderToGroup({
        dataProviders,
        destination,
        dispatch,
        onAddedToTimeline,
        providerToAdd,
        timelineId,
      });

      expect(onAddedToTimeline).toBeCalledWith(providerToAdd.name);
    });
  });

  describe('addContentToTimeline', () => {
    const providerToAdd = { ...providerB, and: [] };

    describe('when the timeline is empty', () => {
      const dataProviders: DataProvider[] = []; // <-- an empty timeline
      const destination = { droppableId: 'droppableId.timelineProviders.timeline-1', index: 0 };

      test('it dispatches the UPDATE_PROVIDERS action with the expected values when the timeline is empty', () => {
        const dispatch = jest.fn();
        const onAddedToTimeline = jest.fn();

        addContentToTimeline({
          dataProviders,
          destination,
          dispatch,
          onAddedToTimeline,
          providerToAdd,
          timelineId,
        });

        expect(dispatch).toBeCalledWith({
          payload: {
            id: 'timeline-1',
            providers: [
              {
                and: [],
                enabled: true,
                excluded: false,
                id: 'context-field.name-b',
                kqlQuery: '',
                name: 'b',
                queryMatch: { field: 'field.name', operator: ':', value: 'b' },
              },
            ],
          },
          type: 'x-pack/security_solution/local/timeline/UPDATE_PROVIDERS',
        });
      });

      test('it invokes onAddedToTimeline with the expected provider name when the timeline is empty', () => {
        const dispatch = jest.fn();
        const onAddedToTimeline = jest.fn();

        addContentToTimeline({
          dataProviders,
          destination,
          dispatch,
          onAddedToTimeline,
          providerToAdd,
          timelineId,
        });

        expect(onAddedToTimeline).toBeCalledWith(providerToAdd.name);
      });
    });

    describe('when the timeline is NOT empty', () => {
      const dataProviders = [{ ...providerA, and: [] }];
      const destination = {
        droppableId: 'droppableId.timelineProviders.timeline-1.group.0',
        index: 0,
      };

      test('it dispatches the UPDATE_PROVIDERS action with the expected values when the timeline is NON-empty', () => {
        const dispatch = jest.fn();
        const onAddedToTimeline = jest.fn();

        addContentToTimeline({
          dataProviders,
          destination,
          dispatch,
          onAddedToTimeline,
          providerToAdd,
          timelineId,
        });

        expect(dispatch).toBeCalledWith({
          payload: {
            id: 'timeline-1',
            providers: [
              {
                and: [
                  {
                    enabled: true,
                    excluded: false,
                    id: 'context-field.name-a',
                    kqlQuery: '',
                    name: 'a',
                    queryMatch: { field: 'field.name', operator: ':', value: 'a' },
                  },
                ],
                enabled: true,
                excluded: false,
                id: 'context-field.name-b',
                kqlQuery: '',
                name: 'b',
                queryMatch: { field: 'field.name', operator: ':', value: 'b' },
              },
            ],
          },
          type: 'x-pack/security_solution/local/timeline/UPDATE_PROVIDERS',
        });
      });

      test('it invokes onAddedToTimeline with the expected provider name when the timeline is NON-empty', () => {
        const dispatch = jest.fn();
        const onAddedToTimeline = jest.fn();

        addContentToTimeline({
          dataProviders,
          destination,
          dispatch,
          onAddedToTimeline,
          providerToAdd,
          timelineId,
        });

        expect(onAddedToTimeline).toBeCalledWith(providerToAdd.name);
      });
    });
  });
});
