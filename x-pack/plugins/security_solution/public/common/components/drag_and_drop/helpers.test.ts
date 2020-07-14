/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { omit } from 'lodash/fp';
import { DropResult } from 'react-beautiful-dnd';

import { IdToDataProvider } from '../../store/drag_and_drop/model';

import {
  addProviderToTimeline,
  allowTopN,
  destinationIsTimelineButton,
  destinationIsTimelineColumns,
  destinationIsTimelineProviders,
  draggableContentPrefix,
  draggableFieldPrefix,
  draggableIdPrefix,
  draggableIsContent,
  draggableIsField,
  droppableIdPrefix,
  droppableTimelineColumnsPrefix,
  droppableTimelineFlyoutButtonPrefix,
  droppableTimelineProvidersPrefix,
  escapeDataProviderId,
  escapeFieldId,
  fieldWasDroppedOnTimelineColumns,
  getDraggableFieldId,
  getDraggableId,
  getDroppableId,
  getFieldIdFromDraggable,
  getProviderIdFromDraggable,
  getTimelineIdFromColumnDroppableId,
  getTimelineProviderDraggableId,
  getTimelineProviderDroppableId,
  providerWasDroppedOnTimeline,
  reasonIsDrop,
  sourceAndDestinationAreSameTimelineProviders,
  sourceIsContent,
  unEscapeFieldId,
  userIsReArrangingProviders,
} from './helpers';

const DROPPABLE_ID_TIMELINE_PROVIDERS = `${droppableTimelineProvidersPrefix}timeline`;

/** a sample droppable id that uniquely identifies a timeline's columns */
const DROPPABLE_ID_TIMELINE_COLUMNS = `${droppableTimelineColumnsPrefix}timeline-1`;

describe('helpers', () => {
  describe('#getDraggableId', () => {
    test('it returns the expected id', () => {
      const id = getDraggableId('dataProvider1234');
      const expected = `${draggableContentPrefix}dataProvider1234`;

      expect(id).toEqual(expected);
    });
  });

  describe('#getDraggableFieldId', () => {
    test('it returns the expected id', () => {
      const id = getDraggableFieldId({ contextId: 'test.context.id', fieldId: 'event.action' });
      const expected = `${draggableFieldPrefix}test_context_id.event!!!DOT!!!action`;

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
          destination: undefined,
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

  describe('#draggableIsField', () => {
    test('it returns returns true when the draggable is a field', () => {
      expect(
        draggableIsField({
          destination: {
            droppableId: 'fake.destination.droppable.id',
            index: 0,
          },
          draggableId: getDraggableFieldId({ contextId: 'test', fieldId: 'event.action' }),
          reason: 'DROP',
          source: {
            droppableId: 'fake.source.droppable.id',
            index: 0,
          },
          type: 'DEFAULT',
          mode: 'FLUID',
        })
      ).toEqual(true);
    });

    test('it returns returns false when the draggable is NOT a field', () => {
      expect(
        draggableIsField({
          destination: {
            droppableId: 'fake.destination.droppable.id',
            index: 0,
          },
          draggableId: getDraggableId('685260508808089'), // content, not a field
          reason: 'DROP',
          source: {
            droppableId: 'fake.source.droppable.id',
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

    test('it returns false when the destination is undefined', () => {
      expect(
        destinationIsTimelineProviders({
          destination: undefined,
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

  describe('#destinationIsTimelineColumns', () => {
    test('it returns returns true when the destination is the timeline columns', () => {
      expect(
        destinationIsTimelineColumns({
          destination: {
            droppableId: DROPPABLE_ID_TIMELINE_COLUMNS,
            index: 0,
          },
          draggableId: getDraggableFieldId({ contextId: 'test', fieldId: 'event.action' }),
          reason: 'DROP',
          source: {
            droppableId: 'fake.source.droppable.id',
            index: 0,
          },
          type: 'DEFAULT',
          mode: 'FLUID',
        })
      ).toEqual(true);
    });

    test('it returns returns false when the destination is undefined', () => {
      expect(
        destinationIsTimelineColumns({
          destination: undefined,
          draggableId: getDraggableFieldId({ contextId: 'test', fieldId: 'event.action' }),
          reason: 'DROP',
          source: {
            droppableId: 'fake.source.droppable.id',
            index: 0,
          },
          type: 'DEFAULT',
          mode: 'FLUID',
        })
      ).toEqual(false);
    });

    test('it returns returns false when the destination is NOT the timeline columns', () => {
      expect(
        destinationIsTimelineColumns({
          destination: {
            droppableId: `${droppableIdPrefix}.somewhere.else`,
            index: 0,
          },
          draggableId: getDraggableFieldId({ contextId: 'test', fieldId: 'event.action' }),
          reason: 'DROP',
          source: {
            droppableId: 'fake.source.droppable.id',
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

    test('it returns false when the destination is undefined', () => {
      expect(
        destinationIsTimelineButton({
          destination: undefined,
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

  describe('#getFieldIdFromDraggable', () => {
    test('it returns the expected id', () => {
      const id = getFieldIdFromDraggable({
        destination: {
          droppableId: DROPPABLE_ID_TIMELINE_COLUMNS,
          index: 0,
        },
        draggableId: getDraggableFieldId({ contextId: 'test', fieldId: 'event.action' }),
        reason: 'DROP',
        source: {
          droppableId: 'fake.source.droppable.id',
          index: 0,
        },
        type: 'DEFAULT',
        mode: 'FLUID',
      });
      const expected = 'event.action';

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
          destination: undefined,
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

  describe('#fieldWasDroppedOnTimelineColumns', () => {
    test('it returns true when a field was dropped on the timeline columns', () => {
      expect(
        fieldWasDroppedOnTimelineColumns({
          destination: {
            droppableId: DROPPABLE_ID_TIMELINE_COLUMNS,
            index: 0,
          },
          draggableId: getDraggableFieldId({ contextId: 'test', fieldId: 'event.action' }),
          reason: 'DROP',
          source: {
            droppableId: 'fake.source.droppable.id',
            index: 0,
          },
          type: 'DEFAULT',
          mode: 'FLUID',
        })
      ).toEqual(true);
    });

    test('it returns returns false when the reason is NOT DROP', () => {
      expect(
        fieldWasDroppedOnTimelineColumns({
          destination: {
            droppableId: DROPPABLE_ID_TIMELINE_COLUMNS,
            index: 0,
          },
          draggableId: getDraggableFieldId({ contextId: 'test', fieldId: 'event.action' }),
          reason: 'CANCEL', // the reason is NOT drop
          source: {
            droppableId: 'fake.source.droppable.id',
            index: 0,
          },
          type: 'DEFAULT',
          mode: 'FLUID',
        })
      ).toEqual(false);
    });

    test('it returns false when the draggable is NOT a field', () => {
      expect(
        fieldWasDroppedOnTimelineColumns({
          destination: {
            droppableId: DROPPABLE_ID_TIMELINE_COLUMNS,
            index: 0,
          },
          draggableId: getDraggableId('non.field.content'), // the draggable is not a field
          reason: 'DROP',
          source: {
            droppableId: 'fake.source.droppable.id',
            index: 0,
          },
          type: 'DEFAULT',
          mode: 'FLUID',
        })
      ).toEqual(false);
    });

    test('it returns returns false when the the destination is NOT timeline columns', () => {
      expect(
        fieldWasDroppedOnTimelineColumns({
          destination: {
            droppableId: `${droppableIdPrefix}.somewhere.else`,
            index: 0,
          },
          draggableId: getDraggableFieldId({ contextId: 'test', fieldId: 'event.action' }),
          reason: 'DROP',
          source: {
            droppableId: 'fake.source.droppable.id',
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

  describe('#escapeFieldId', () => {
    test('it should escape "."s in a field name', () => {
      const escaped = escapeFieldId('hello.how.are.you');
      expect(escaped).toEqual('hello!!!DOT!!!how!!!DOT!!!are!!!DOT!!!you');
    });

    test('it should NOT escape a string when the field name has no "."s', () => {
      const escaped = escapeFieldId('hello!!!DOT!!!how!!!DOT!!!are!!!DOT!!!you?');
      expect(escaped).toEqual('hello!!!DOT!!!how!!!DOT!!!are!!!DOT!!!you?');
    });
  });

  describe('#unEscapeFieldId', () => {
    test('it should un-escape a field name containing !!!DOT!!! escape sequences', () => {
      const escaped = unEscapeFieldId('hello!!!DOT!!!how!!!DOT!!!are!!!DOT!!!you');
      expect(escaped).toEqual('hello.how.are.you');
    });

    test('it should NOT escape a string when the field name has no !!!DOT!!! escape characters', () => {
      const escaped = unEscapeFieldId('hello.how.are.you?');
      expect(escaped).toEqual('hello.how.are.you?');
    });
  });

  describe('#allowTopN', () => {
    const aggregatableAllowedType = {
      category: 'cloud',
      description:
        'The cloud account or organization id used to identify different entities in a multi-tenant environment. Examples: AWS account id, Google Cloud ORG Id, or other unique identifier.',
      example: '666777888999',
      indexes: ['auditbeat', 'filebeat', 'packetbeat'],
      name: 'cloud.account.id',
      searchable: true,
      type: 'string',
      aggregatable: true,
      format: '',
    };

    test('it returns true for an aggregatable field that is an allowed type', () => {
      expect(
        allowTopN({
          browserField: aggregatableAllowedType,
          fieldName: aggregatableAllowedType.name,
        })
      ).toBe(true);
    });

    test('it returns true for a whitelisted non-BrowserField', () => {
      expect(
        allowTopN({
          browserField: undefined,
          fieldName: 'signal.rule.name',
        })
      ).toBe(true);
    });

    test('it returns false for a NON-aggregatable field that is an allowed type', () => {
      const nonAggregatableAllowedType = {
        ...aggregatableAllowedType,
        aggregatable: false,
      };

      expect(
        allowTopN({
          browserField: nonAggregatableAllowedType,
          fieldName: nonAggregatableAllowedType.name,
        })
      ).toBe(false);
    });

    test('it returns false for a aggregatable field that is NOT an allowed type', () => {
      const aggregatableNotAllowedType = {
        ...aggregatableAllowedType,
        type: 'not-an-allowed-type',
      };

      expect(
        allowTopN({
          browserField: aggregatableNotAllowedType,
          fieldName: aggregatableNotAllowedType.name,
        })
      ).toBe(false);
    });

    test('it returns false if the BrowserField is missing the aggregatable property', () => {
      const missingAggregatable = omit('aggregatable', aggregatableAllowedType);

      expect(
        allowTopN({
          browserField: missingAggregatable,
          fieldName: missingAggregatable.name,
        })
      ).toBe(false);
    });

    test('it returns false if the BrowserField is missing the type property', () => {
      const missingType = omit('type', aggregatableAllowedType);

      expect(
        allowTopN({
          browserField: missingType,
          fieldName: missingType.name,
        })
      ).toBe(false);
    });

    test('it returns false for a non-whitelisted field when a BrowserField is not provided', () => {
      expect(
        allowTopN({
          browserField: undefined,
          fieldName: 'non-whitelisted',
        })
      ).toBe(false);
    });
  });

  describe('getTimelineProviderDroppableId', () => {
    test('it returns the expected id', () => {
      expect(
        getTimelineProviderDroppableId({
          groupIndex: 1234,
          timelineId: 'i-hope-you-had-the-time-of-your-life',
        })
      ).toEqual('droppableId.timelineProviders.i-hope-you-had-the-time-of-your-life.group.1234');
    });
  });

  describe('getTimelineProviderDraggableId', () => {
    test('it returns the expected id', () => {
      const dataProviderId =
        'port-default-draggable-netflow-renderer-timeline-1-Ib4zD3IBbNV0npT21btr-Ib4zD3IBbNV0npT21btr-source_port-57828';

      expect(
        getTimelineProviderDraggableId({
          dataProviderId,
          groupIndex: 1234,
          timelineId: 'time-to-make-the-doughnuts',
        })
      ).toEqual(
        `draggableId.timelineProviders.time-to-make-the-doughnuts.group.1234.${dataProviderId}`
      );
    });
  });

  describe('sourceAndDestinationAreSameTimelineProviders', () => {
    test('it returns true when the source and destination droppable IDs exactly match', () => {
      const result: DropResult = {
        destination: { droppableId: 'droppableId.timelineProviders.timeline-1.group.0', index: 1 },
        draggableId:
          'draggableId.timelineProviders.timeline-1.group.0.port-default-draggable-netflow-renderer-timeline-1-Ib4zD3IBbNV0npT21btr-Ib4zD3IBbNV0npT21btr-source_port-57828',
        mode: 'FLUID',
        reason: 'DROP',
        source: { index: 0, droppableId: 'droppableId.timelineProviders.timeline-1.group.0' },
        type: 'DEFAULT',
      };

      expect(sourceAndDestinationAreSameTimelineProviders(result)).toBe(true);
    });

    test('it returns true when the source and destination droppable IDs are the same timeline, but different groups', () => {
      const result: DropResult = {
        destination: { droppableId: 'droppableId.timelineProviders.timeline-1.group.0', index: 1 },
        draggableId:
          'draggableId.timelineProviders.timeline-1.group.0.port-default-draggable-netflow-renderer-timeline-1-Ib4zD3IBbNV0npT21btr-Ib4zD3IBbNV0npT21btr-source_port-57828',
        mode: 'FLUID',
        reason: 'DROP',
        source: { index: 0, droppableId: 'droppableId.timelineProviders.timeline-1.group.1' },
        type: 'DEFAULT',
      };

      expect(sourceAndDestinationAreSameTimelineProviders(result)).toBe(true);
    });

    test('it returns false when destination is undefined', () => {
      const result: DropResult = {
        draggableId:
          'draggableId.timelineProviders.timeline-1.group.0.port-default-draggable-netflow-renderer-timeline-1-Ib4zD3IBbNV0npT21btr-Ib4zD3IBbNV0npT21btr-source_port-57828',
        mode: 'FLUID',
        reason: 'DROP',
        source: { index: 0, droppableId: 'droppableId.timelineProviders.timeline-1.group.1' },
        type: 'DEFAULT',
      };

      expect(sourceAndDestinationAreSameTimelineProviders(result)).toBe(false);
    });

    test('it returns false when the source and destination droppable IDs are for different timelines', () => {
      const result: DropResult = {
        destination: { droppableId: 'droppableId.timelineProviders.timeline-1.group.0', index: 1 },
        draggableId:
          'draggableId.timelineProviders.timeline-1.group.0.port-default-draggable-netflow-renderer-timeline-1-Ib4zD3IBbNV0npT21btr-Ib4zD3IBbNV0npT21btr-source_port-57828',
        mode: 'FLUID',
        reason: 'DROP',
        source: { index: 0, droppableId: 'droppableId.timelineProviders.timeline-2.group.0' },
        type: 'DEFAULT',
      };

      expect(sourceAndDestinationAreSameTimelineProviders(result)).toBe(false);
    });

    test('it returns false when the destination is NOT timeline providers', () => {
      const result: DropResult = {
        destination: { droppableId: 'droppableId.otherProviders.timeline-1.group.0', index: 1 },
        draggableId:
          'draggableId.timelineProviders.timeline-1.group.0.port-default-draggable-netflow-renderer-timeline-1-Ib4zD3IBbNV0npT21btr-Ib4zD3IBbNV0npT21btr-source_port-57828',
        mode: 'FLUID',
        reason: 'DROP',
        source: { index: 0, droppableId: 'droppableId.timelineProviders.timeline-1.group.0' },
        type: 'DEFAULT',
      };

      expect(sourceAndDestinationAreSameTimelineProviders(result)).toBe(false);
    });

    test('it returns false when the source is NOT timeline providers', () => {
      const result: DropResult = {
        destination: { droppableId: 'droppableId.timelineProviders.timeline-1.group.0', index: 1 },
        draggableId:
          'draggableId.timelineProviders.timeline-1.group.0.port-default-draggable-netflow-renderer-timeline-1-Ib4zD3IBbNV0npT21btr-Ib4zD3IBbNV0npT21btr-source_port-57828',
        mode: 'FLUID',
        reason: 'DROP',
        source: { index: 0, droppableId: 'droppableId.otherProviders.timeline-1.group.0' },
        type: 'DEFAULT',
      };

      expect(sourceAndDestinationAreSameTimelineProviders(result)).toBe(false);
    });
  });

  describe('userIsReArrangingProviders', () => {
    test('it returns true when reason IS DROP and source + destination are the SAME timeline providers', () => {
      const result: DropResult = {
        destination: { droppableId: 'droppableId.timelineProviders.timeline-1.group.0', index: 1 },
        draggableId:
          'draggableId.timelineProviders.timeline-1.group.0.port-default-draggable-netflow-renderer-timeline-1-Ib4zD3IBbNV0npT21btr-Ib4zD3IBbNV0npT21btr-source_port-57828',
        mode: 'FLUID',
        reason: 'DROP',
        source: { index: 0, droppableId: 'droppableId.timelineProviders.timeline-1.group.0' },
        type: 'DEFAULT',
      };

      expect(userIsReArrangingProviders(result)).toBe(true);
    });

    test('it returns false when reason IS DROP, but source + destination are NOT the same timeline providers', () => {
      const result: DropResult = {
        destination: { droppableId: 'droppableId.otherProviders.timeline-1.group.0', index: 1 },
        draggableId:
          'draggableId.timelineProviders.timeline-1.group.0.port-default-draggable-netflow-renderer-timeline-1-Ib4zD3IBbNV0npT21btr-Ib4zD3IBbNV0npT21btr-source_port-57828',
        mode: 'FLUID',
        reason: 'DROP',
        source: { index: 0, droppableId: 'droppableId.timelineProviders.timeline-1.group.0' },
        type: 'DEFAULT',
      };

      expect(userIsReArrangingProviders(result)).toBe(false);
    });

    test('it returns false when the reason is NOT DROP and source + destination are the SAME timeline providers', () => {
      const result: DropResult = {
        destination: { droppableId: 'droppableId.timelineProviders.timeline-1.group.0', index: 1 },
        draggableId:
          'draggableId.timelineProviders.timeline-1.group.0.port-default-draggable-netflow-renderer-timeline-1-Ib4zD3IBbNV0npT21btr-Ib4zD3IBbNV0npT21btr-source_port-57828',
        mode: 'FLUID',
        reason: 'CANCEL',
        source: { index: 0, droppableId: 'droppableId.timelineProviders.timeline-1.group.0' },
        type: 'DEFAULT',
      };

      expect(userIsReArrangingProviders(result)).toBe(false);
    });

    test('it returns false when the reason is NOT DROP and source + destination are NOT the same timeline providers', () => {
      const result: DropResult = {
        destination: { droppableId: 'droppableId.otherProviders.timeline-1.group.0', index: 1 },
        draggableId:
          'draggableId.timelineProviders.timeline-1.group.0.port-default-draggable-netflow-renderer-timeline-1-Ib4zD3IBbNV0npT21btr-Ib4zD3IBbNV0npT21btr-source_port-57828',
        mode: 'FLUID',
        reason: 'CANCEL',
        source: { index: 0, droppableId: 'droppableId.timelineProviders.timeline-1.group.0' },
        type: 'DEFAULT',
      };

      expect(userIsReArrangingProviders(result)).toBe(false);
    });

    test('it returns false when reason IS DROP, but destination is undefined', () => {
      const result: DropResult = {
        draggableId:
          'draggableId.timelineProviders.timeline-1.group.0.port-default-draggable-netflow-renderer-timeline-1-Ib4zD3IBbNV0npT21btr-Ib4zD3IBbNV0npT21btr-source_port-57828',
        mode: 'FLUID',
        reason: 'DROP',
        source: { index: 0, droppableId: 'droppableId.timelineProviders.timeline-1.group.1' },
        type: 'DEFAULT',
      };

      expect(userIsReArrangingProviders(result)).toBe(false);
    });
  });

  describe('addProviderToTimeline', () => {
    const result: DropResult = {
      destination: { droppableId: 'droppableId.timelineProviders.timeline-1', index: 0 },
      draggableId: 'draggableId.content.hosts-table-hostName-ENDPOINT-W-0-01',
      mode: 'FLUID',
      reason: 'DROP',
      source: { index: 0, droppableId: 'droppableId.content.hosts-table-hostName-ENDPOINT-W-0-01' },
      type: 'DEFAULT',
    };

    test('it dispatches the expected UPDATE_PROVIDERS action when the provider to add exists in the `dataProviders` collection of `id -> `DataProvider`', () => {
      const dispatch = jest.fn();
      const onAddedToTimeline = jest.fn();
      const dataProviders: IdToDataProvider = {
        'hosts-table-hostName-ENDPOINT-W-0-01': {
          and: [],
          enabled: true,
          excluded: false,
          id: 'hosts-table-hostName-ENDPOINT-W-0-01',
          kqlQuery: '',
          name: 'ENDPOINT-W-0-01',
          queryMatch: { field: 'host.name', value: 'ENDPOINT-W-0-01', operator: ':' },
        },
      };

      addProviderToTimeline({
        activeTimelineDataProviders: [],
        dataProviders,
        dispatch,
        result,
        timelineId: 'timeline-1',
        onAddedToTimeline,
      });

      expect(dispatch).toBeCalledWith({
        payload: {
          id: 'timeline-1',
          providers: [
            {
              and: [],
              enabled: true,
              excluded: false,
              id: 'hosts-table-hostName-ENDPOINT-W-0-01',
              kqlQuery: '',
              name: 'ENDPOINT-W-0-01',
              queryMatch: { field: 'host.name', operator: ':', value: 'ENDPOINT-W-0-01' },
            },
          ],
        },
        type: 'x-pack/security_solution/local/timeline/UPDATE_PROVIDERS',
      });
    });

    test('it dispatches the expected NO_PROVIDER_FOUND action when the provider to add does NOT exist in the `dataProviders` collection of `id -> `DataProvider`', () => {
      const dispatch = jest.fn();
      const onAddedToTimeline = jest.fn();

      addProviderToTimeline({
        activeTimelineDataProviders: [],
        dataProviders: {}, // <-- the specified data provider ID does not exist in this empty collection
        dispatch,
        result,
        timelineId: 'timeline-1',
        onAddedToTimeline,
      });

      expect(dispatch).toBeCalledWith({
        payload: {
          id: 'hosts-table-hostName-ENDPOINT-W-0-01',
        },
        type: 'x-pack/security_solution/local/drag_and_drop/NO_PROVIDER_FOUND',
      });
    });
  });

  describe('getTimelineIdFromColumnDroppableId', () => {
    test('it returns the expected timelineId from a column droppableId', () => {
      expect(getTimelineIdFromColumnDroppableId(DROPPABLE_ID_TIMELINE_COLUMNS)).toEqual(
        'timeline-1'
      );
    });

    test('it returns an empty string when the droppableId is an empty string', () => {
      expect(getTimelineIdFromColumnDroppableId('')).toEqual('');
    });
  });
});
