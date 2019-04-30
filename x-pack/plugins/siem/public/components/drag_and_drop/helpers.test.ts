/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  destinationIsTimelineButton,
  destinationIsTimelineProviders,
  draggableContentPrefix,
  draggableIdPrefix,
  draggableIsContent,
  droppableIdPrefix,
  droppableTimelineFlyoutButtonPrefix,
  droppableTimelineProvidersPrefix,
  escapeDataProviderId,
  getDraggableId,
  getDroppableId,
  getProviderIdFromDraggable,
  getTimelineIdFromDestination,
  providerWasDroppedOnTimeline,
  reasonIsDrop,
  sourceIsContent,
} from './helpers';

const DROPPABLE_ID_TIMELINE_PROVIDERS = `${droppableTimelineProvidersPrefix}timeline`;

describe('helpers', () => {
  describe('#getDraggableId', () => {
    test('it returns the expected id', () => {
      const id = getDraggableId('dataProvider1234');
      const expected = `${draggableContentPrefix}dataProvider1234`;

      expect(id).toEqual(expected);
    });
  });

  describe('#getDroppableId', () => {
    test('it returns the expected id', () => {
      const id = getDroppableId('a-visualization');
      const expected = `${droppableIdPrefix}.content.a-visualization`;

      expect(id).toEqual(expected);
    });
  });

  describe('#sourceIsContent', () => {
    test('it returns returns true when the source is content', () => {
      expect(
        sourceIsContent({
          destination: { droppableId: `${droppableIdPrefix}.timelineProviders.timeline`, index: 0 },
          draggableId: getDraggableId('2119990039033485'),
          reason: 'DROP',
          source: { index: 0, droppableId: getDroppableId('2119990039033485') },
          type: 'DEFAULT',
          mode: 'FLUID',
        })
      ).toEqual(true);
    });

    test('it returns false when the source is NOT content', () => {
      expect(
        sourceIsContent({
          destination: { droppableId: `${droppableIdPrefix}.timelineProviders.timeline`, index: 0 },
          draggableId: `${draggableIdPrefix}.somethingElse.2119990039033485`,
          reason: 'DROP',
          source: { index: 0, droppableId: `${droppableIdPrefix}.somethingElse.2119990039033485` },
          type: 'DEFAULT',
          mode: 'FLUID',
        })
      ).toEqual(false);
    });
  });

  describe('#draggableIsContent', () => {
    test('it returns returns true when the draggable is content', () => {
      expect(
        draggableIsContent({
          destination: {
            droppableId: DROPPABLE_ID_TIMELINE_PROVIDERS,
            index: 0,
          },
          draggableId: getDraggableId('685260508808089'),
          reason: 'DROP',
          source: {
            droppableId: getDroppableId('685260508808089'),
            index: 0,
          },
          type: 'DEFAULT',
          mode: 'FLUID',
        })
      ).toEqual(true);
    });

    test('it returns false when the draggable is NOT content', () => {
      expect(
        draggableIsContent({
          destination: null,
          draggableId: `${draggableIdPrefix}.timeline.timeline.dataProvider.685260508808089`,
          reason: 'DROP',
          source: {
            droppableId: getDroppableId('timeline'),
            index: 0,
          },
          type: 'DEFAULT',
          mode: 'FLUID',
        })
      ).toEqual(false);
    });
  });

  describe('#reasonIsDrop', () => {
    test('it returns returns true when the reason is DROP', () => {
      expect(
        reasonIsDrop({
          destination: {
            droppableId: DROPPABLE_ID_TIMELINE_PROVIDERS,
            index: 0,
          },
          draggableId: getDraggableId('685260508808089'),
          reason: 'DROP',
          source: {
            droppableId: getDroppableId('685260508808089'),
            index: 0,
          },
          type: 'DEFAULT',
          mode: 'FLUID',
        })
      ).toEqual(true);
    });

    test('it returns false when the reason is NOT DROP', () => {
      expect(
        reasonIsDrop({
          destination: {
            droppableId: DROPPABLE_ID_TIMELINE_PROVIDERS,
            index: 0,
          },
          draggableId: getDraggableId('685260508808089'),
          reason: 'CANCEL',
          source: {
            droppableId: getDroppableId('685260508808089'),
            index: 0,
          },
          type: 'DEFAULT',
          mode: 'FLUID',
        })
      ).toEqual(false);
    });
  });

  describe('#destinationIsTimelineProviders', () => {
    test('it returns returns true when the destination is timelineProviders', () => {
      expect(
        destinationIsTimelineProviders({
          destination: {
            droppableId: DROPPABLE_ID_TIMELINE_PROVIDERS,
            index: 0,
          },
          draggableId: getDraggableId('685260508808089'),
          reason: 'DROP',
          source: {
            droppableId: getDroppableId('685260508808089'),
            index: 0,
          },
          type: 'DEFAULT',
          mode: 'FLUID',
        })
      ).toEqual(true);
    });

    test('it returns false when the destination is null', () => {
      expect(
        destinationIsTimelineProviders({
          destination: null,
          draggableId: getDraggableId('685260508808089'),
          reason: 'DROP',
          source: {
            droppableId: getDroppableId('timeline'),
            index: 0,
          },
          type: 'DEFAULT',
          mode: 'FLUID',
        })
      ).toEqual(false);
    });

    test('it returns false when the destination is NOT timelineProviders', () => {
      expect(
        destinationIsTimelineProviders({
          destination: {
            droppableId: `${droppableIdPrefix}.somewhere.else`,
            index: 0,
          },
          draggableId: getDraggableId('685260508808089'),
          reason: 'DROP',
          source: {
            droppableId: getDroppableId('685260508808089'),
            index: 0,
          },
          type: 'DEFAULT',
          mode: 'FLUID',
        })
      ).toEqual(false);
    });
  });

  describe('#destinationIsTimelineButton', () => {
    test('it returns returns true when the destination is a flyout button', () => {
      expect(
        destinationIsTimelineButton({
          destination: {
            droppableId: `${droppableTimelineFlyoutButtonPrefix}.timeline`,
            index: 0,
          },
          draggableId: getDraggableId('685260508808089'),
          reason: 'DROP',
          source: {
            droppableId: getDroppableId('685260508808089'),
            index: 0,
          },
          type: 'DEFAULT',
          mode: 'FLUID',
        })
      ).toEqual(true);
    });

    test('it returns false when the destination is null', () => {
      expect(
        destinationIsTimelineButton({
          destination: null,
          draggableId: getDraggableId('685260508808089'),
          reason: 'DROP',
          source: {
            droppableId: DROPPABLE_ID_TIMELINE_PROVIDERS,
            index: 0,
          },
          type: 'DEFAULT',
          mode: 'FLUID',
        })
      ).toEqual(false);
    });

    test('it returns false when the destination is NOT a flyout button', () => {
      expect(
        destinationIsTimelineButton({
          destination: {
            droppableId: `${droppableIdPrefix}.somewhere.else`,
            index: 0,
          },
          draggableId: getDraggableId('685260508808089'),
          reason: 'DROP',
          source: {
            droppableId: getDroppableId('685260508808089'),
            index: 0,
          },
          type: 'DEFAULT',
          mode: 'FLUID',
        })
      ).toEqual(false);
    });
  });

  describe('#getTimelineIdFromDestination', () => {
    test('it returns returns the timeline id from the destination when it is a provider', () => {
      expect(
        getTimelineIdFromDestination({
          destination: {
            droppableId: DROPPABLE_ID_TIMELINE_PROVIDERS,
            index: 0,
          },
          draggableId: getDraggableId('685260508808089'),
          reason: 'DROP',
          source: {
            droppableId: getDroppableId('685260508808089'),
            index: 0,
          },
          type: 'DEFAULT',
          mode: 'FLUID',
        })
      ).toEqual('timeline');
    });

    test('it returns returns the timeline id from the destination when it is a button', () => {
      expect(
        getTimelineIdFromDestination({
          destination: {
            droppableId: `${droppableTimelineFlyoutButtonPrefix}timeline`,
            index: 0,
          },
          draggableId: getDraggableId('685260508808089'),
          reason: 'DROP',
          source: {
            droppableId: getDroppableId('685260508808089'),
            index: 0,
          },
          type: 'DEFAULT',
          mode: 'FLUID',
        })
      ).toEqual('timeline');
    });

    test('it returns returns an empty string when the destination is null', () => {
      expect(
        getTimelineIdFromDestination({
          destination: null,
          draggableId: `${draggableIdPrefix}.timeline.timeline.dataProvider.685260508808089`,
          reason: 'DROP',
          source: {
            droppableId: `${droppableIdPrefix}.timelineProviders.timeline`,
            index: 0,
          },
          type: 'DEFAULT',
          mode: 'FLUID',
        })
      ).toEqual('');
    });

    test('it returns returns an empty string when the destination is not a timeline', () => {
      expect(
        getTimelineIdFromDestination({
          destination: {
            droppableId: `${droppableIdPrefix}.somewhere.else`,
            index: 0,
          },
          draggableId: getDraggableId('685260508808089'),
          reason: 'DROP',
          source: {
            droppableId: getDroppableId('685260508808089'),
            index: 0,
          },
          type: 'DEFAULT',
          mode: 'FLUID',
        })
      ).toEqual('');
    });
  });

  describe('#getProviderIdFromDraggable', () => {
    test('it returns the expected id', () => {
      const id = getProviderIdFromDraggable({
        destination: {
          droppableId: DROPPABLE_ID_TIMELINE_PROVIDERS,
          index: 0,
        },
        draggableId: getDraggableId('2119990039033485'),
        reason: 'DROP',
        source: {
          droppableId: getDroppableId('2119990039033485'),
          index: 0,
        },
        type: 'DEFAULT',
        mode: 'FLUID',
      });
      const expected = '2119990039033485';

      expect(id).toEqual(expected);
    });
  });

  describe('#providerWasDroppedOnTimeline', () => {
    test('it returns returns true when a provider was dropped on the timeline', () => {
      expect(
        providerWasDroppedOnTimeline({
          destination: {
            droppableId: DROPPABLE_ID_TIMELINE_PROVIDERS,
            index: 0,
          },
          draggableId: getDraggableId('2119990039033485'),
          reason: 'DROP',
          source: {
            droppableId: getDroppableId('2119990039033485'),
            index: 0,
          },
          type: 'DEFAULT',
          mode: 'FLUID',
        })
      ).toEqual(true);
    });

    test('it returns false when the reason is NOT DROP', () => {
      expect(
        providerWasDroppedOnTimeline({
          destination: {
            droppableId: DROPPABLE_ID_TIMELINE_PROVIDERS,
            index: 0,
          },
          draggableId: getDraggableId('2119990039033485'),
          reason: 'CANCEL',
          source: {
            droppableId: getDroppableId('2119990039033485'),
            index: 0,
          },
          type: 'DEFAULT',
          mode: 'FLUID',
        })
      ).toEqual(false);
    });

    test('it returns false when the draggable is NOT content', () => {
      expect(
        providerWasDroppedOnTimeline({
          destination: null,
          draggableId: `${draggableIdPrefix}.timeline.timeline.dataProvider.685260508808089`,
          reason: 'DROP',
          source: {
            droppableId: getDroppableId('timeline'),
            index: 0,
          },
          type: 'DEFAULT',
          mode: 'FLUID',
        })
      ).toEqual(false);
    });

    test('it returns false when the the source is NOT content', () => {
      expect(
        providerWasDroppedOnTimeline({
          destination: { droppableId: DROPPABLE_ID_TIMELINE_PROVIDERS, index: 0 },
          draggableId: `${draggableIdPrefix}.somethingElse.2119990039033485`,
          reason: 'DROP',
          source: { index: 0, droppableId: `${droppableIdPrefix}.somethingElse.2119990039033485` },
          type: 'DEFAULT',
          mode: 'FLUID',
        })
      ).toEqual(false);
    });

    test('it returns false when the the destination is NOT timeline providers', () => {
      expect(
        providerWasDroppedOnTimeline({
          destination: {
            droppableId: `${droppableIdPrefix}.somewhere.else`,
            index: 0,
          },
          draggableId: getDraggableId('685260508808089'),
          reason: 'DROP',
          source: {
            droppableId: getDroppableId('685260508808089'),
            index: 0,
          },
          type: 'DEFAULT',
          mode: 'FLUID',
        })
      ).toEqual(false);
    });
  });

  describe('#escapeDataProviderId', () => {
    test('it should escape dotted notation', () => {
      const escaped = escapeDataProviderId('hello.how.are.you');
      expect(escaped).toEqual('hello_how_are_you');
    });

    test('it should not escape a string without dotted notation', () => {
      const escaped = escapeDataProviderId('hello how are you?');
      expect(escaped).toEqual('hello how are you?');
    });
  });
});
