/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { eventHasNotes, eventIsPinned, getPinOnClick, getPinTooltip } from './helpers';
import { TimelineType } from '../../../../../common/api/timeline';

describe('helpers', () => {
  describe('eventHasNotes', () => {
    test('it returns false for when notes is empty', () => {
      expect(eventHasNotes([])).toEqual(false);
    });

    test('it returns true when notes is non-empty', () => {
      expect(eventHasNotes(['8af859e2-e4f8-4754-b702-4f227f15aae5'])).toEqual(true);
    });
  });

  describe('getPinTooltip', () => {
    test('it indicates the event may NOT be unpinned when `isPinned` is `true` and the event has notes', () => {
      expect(
        getPinTooltip({
          isAlert: false,
          isPinned: true,
          eventHasNotes: true,
          timelineType: TimelineType.default,
        })
      ).toEqual('This event cannot be unpinned because it has notes');
    });

    test('it indicates the alert may NOT be unpinned when `isPinned` is `true` and the alert has notes', () => {
      expect(
        getPinTooltip({
          isAlert: true,
          isPinned: true,
          eventHasNotes: true,
          timelineType: TimelineType.default,
        })
      ).toEqual('This alert cannot be unpinned because it has notes');
    });

    test('it indicates the event is pinned when `isPinned` is `true` and the event does NOT have notes', () => {
      expect(
        getPinTooltip({
          isAlert: false,
          isPinned: true,
          eventHasNotes: false,
          timelineType: TimelineType.default,
        })
      ).toEqual('Unpin event');
    });

    test('it indicates the alert is pinned when `isPinned` is `true` and the alert does NOT have notes', () => {
      expect(
        getPinTooltip({
          isAlert: true,
          isPinned: true,
          eventHasNotes: false,
          timelineType: TimelineType.default,
        })
      ).toEqual('Unpin alert');
    });

    test('it indicates the event is pinned when `isPinned` is `false` and the event has notes', () => {
      expect(
        getPinTooltip({
          isAlert: false,
          isPinned: false,
          eventHasNotes: true,
          timelineType: TimelineType.default,
        })
      ).toEqual('This event cannot be unpinned because it has notes');
    });

    test('it indicates the alert is pinned when `isPinned` is `false` and the alert has notes', () => {
      expect(
        getPinTooltip({
          isAlert: true,
          isPinned: false,
          eventHasNotes: true,
          timelineType: TimelineType.default,
        })
      ).toEqual('This alert cannot be unpinned because it has notes');
    });

    test('it indicates the event is NOT pinned when `isPinned` is `false` and the event does NOT have notes', () => {
      expect(
        getPinTooltip({
          isAlert: false,
          isPinned: false,
          eventHasNotes: false,
          timelineType: TimelineType.default,
        })
      ).toEqual('Pin event');
    });

    test('it indicates the alert is NOT pinned when `isPinned` is `false` and the alert does NOT have notes', () => {
      expect(
        getPinTooltip({
          isAlert: true,
          isPinned: false,
          eventHasNotes: false,
          timelineType: TimelineType.default,
        })
      ).toEqual('Pin alert');
    });

    test('it indicates the event is disabled if timelineType is template', () => {
      expect(
        getPinTooltip({
          isAlert: false,
          isPinned: false,
          eventHasNotes: false,
          timelineType: TimelineType.template,
        })
      ).toEqual('This event may not be pinned while editing a template timeline');
    });

    test('it indicates the alert is disabled if timelineType is template', () => {
      expect(
        getPinTooltip({
          isAlert: true,
          isPinned: false,
          eventHasNotes: false,
          timelineType: TimelineType.template,
        })
      ).toEqual('This alert may not be pinned while editing a template timeline');
    });
  });

  describe('eventIsPinned', () => {
    test('returns true when the specified event id is contained in the pinnedEventIds', () => {
      const eventId = 'race-for-the-prize';
      const pinnedEventIds = { [eventId]: true, 'waiting-for-superman': true };

      expect(eventIsPinned({ eventId, pinnedEventIds })).toEqual(true);
    });

    test('returns false when the specified event id is NOT contained in the pinnedEventIds', () => {
      const eventId = 'safety-pin';
      const pinnedEventIds = { 'thumb-tack': true };

      expect(eventIsPinned({ eventId, pinnedEventIds })).toEqual(false);
    });
  });

  describe('getPinOnClick', () => {
    const eventId = 'abcd';

    test('it invokes `onPinEvent` with the expected eventId when the event is NOT pinned, and allowUnpinning is true', () => {
      const isEventPinned = false; // the event is NOT pinned
      const allowUnpinning = true;
      const onPinEvent = jest.fn();

      getPinOnClick({
        allowUnpinning,
        eventId,
        onPinEvent,
        onUnPinEvent: jest.fn(),
        isEventPinned,
      });

      expect(onPinEvent).toBeCalledWith(eventId);
    });

    test('it does NOT invoke `onPinEvent` when the event is NOT pinned, and allowUnpinning is false', () => {
      const isEventPinned = false; // the event is NOT pinned
      const allowUnpinning = false;
      const onPinEvent = jest.fn();

      getPinOnClick({
        allowUnpinning,
        eventId,
        onPinEvent,
        onUnPinEvent: jest.fn(),
        isEventPinned,
      });

      expect(onPinEvent).not.toBeCalled();
    });

    test('it invokes `onUnPinEvent` with the expected eventId when the event is pinned, and allowUnpinning is true', () => {
      const isEventPinned = true; // the event is pinned
      const allowUnpinning = true;
      const onUnPinEvent = jest.fn();

      getPinOnClick({
        allowUnpinning,
        eventId,
        onPinEvent: jest.fn(),
        onUnPinEvent,
        isEventPinned,
      });

      expect(onUnPinEvent).toBeCalledWith(eventId);
    });

    test('it does NOT invoke `onUnPinEvent` when the event is pinned, and allowUnpinning is false', () => {
      const isEventPinned = true; // the event is pinned
      const allowUnpinning = false;
      const onUnPinEvent = jest.fn();

      getPinOnClick({
        allowUnpinning,
        eventId,
        onPinEvent: jest.fn(),
        onUnPinEvent,
        isEventPinned,
      });

      expect(onUnPinEvent).not.toBeCalled();
    });
  });
});
