/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EventType } from '../../store/timeline/model';

import * as i18n from './translations';

export interface TopNOption {
  inputDisplay: string;
  value: EventType;
  'data-test-subj': string;
}

/** A (stable) array containing only the 'All events' option */
export const allEvents: TopNOption[] = [
  {
    value: 'all',
    inputDisplay: i18n.ALL_EVENTS,
    'data-test-subj': 'option-all',
  },
];

/** A (stable) array containing only the 'Raw events' option */
export const rawEvents: TopNOption[] = [
  {
    value: 'raw',
    inputDisplay: i18n.RAW_EVENTS,
    'data-test-subj': 'option-raw',
  },
];

/** A (stable) array containing only the 'Signal events' option */
export const signalEvents: TopNOption[] = [
  {
    value: 'signal',
    inputDisplay: i18n.SIGNAL_EVENTS,
    'data-test-subj': 'option-signal',
  },
];

/** A (stable) array containing the default Top N options */
export const defaultOptions = [...rawEvents, ...signalEvents];

/**
 * Returns the options to be displayed in a Top N view select. When
 * an `activeTimelineEventType` is provided, an array containing
 * just one option (corresponding to `activeTimelineEventType`)
 * will be returned, to ensure the data displayed in the Top N
 * is always in sync with the `EventType` chosen by the user in
 * the active timeline.
 */
export const getOptions = (activeTimelineEventType?: EventType): TopNOption[] => {
  switch (activeTimelineEventType) {
    case 'all':
      return allEvents;
    case 'raw':
      return rawEvents;
    case 'signal':
      return signalEvents;
    default:
      return defaultOptions;
  }
};
