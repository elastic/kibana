/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

export const maxSizeStoredUnits = [
  {
    value: 'gb',
    text: i18n.translate('xpack.indexLifecycleMgmt.hotPhase.gigabytesLabel', {
      defaultMessage: 'gigabytes',
    }),
  },
  {
    value: 'mb',
    text: i18n.translate('xpack.indexLifecycleMgmt.hotPhase.megabytesLabel', {
      defaultMessage: 'megabytes',
    }),
  },
  {
    value: 'b',
    text: i18n.translate('xpack.indexLifecycleMgmt.hotPhase.bytesLabel', {
      defaultMessage: 'bytes',
    }),
  },
  {
    value: 'kb',
    text: i18n.translate('xpack.indexLifecycleMgmt.hotPhase.kilobytesLabel', {
      defaultMessage: 'kilobytes',
    }),
  },
  {
    value: 'tb',
    text: i18n.translate('xpack.indexLifecycleMgmt.hotPhase.terabytesLabel', {
      defaultMessage: 'terabytes',
    }),
  },
  {
    value: 'pb',
    text: i18n.translate('xpack.indexLifecycleMgmt.hotPhase.petabytesLabel', {
      defaultMessage: 'petabytes',
    }),
  },
];

export const maxAgeUnits = [
  {
    value: 'd',
    text: i18n.translate('xpack.indexLifecycleMgmt.hotPhase.daysLabel', {
      defaultMessage: 'days',
    }),
  },
  {
    value: 'h',
    text: i18n.translate('xpack.indexLifecycleMgmt.hotPhase.hoursLabel', {
      defaultMessage: 'hours',
    }),
  },
  {
    value: 'm',
    text: i18n.translate('xpack.indexLifecycleMgmt.hotPhase.minutesLabel', {
      defaultMessage: 'minutes',
    }),
  },
  {
    value: 's',
    text: i18n.translate('xpack.indexLifecycleMgmt.hotPhase.secondsLabel', {
      defaultMessage: 'seconds',
    }),
  },
  {
    value: 'ms',
    text: i18n.translate('xpack.indexLifecycleMgmt.hotPhase.millisecondsLabel', {
      defaultMessage: 'milliseconds',
    }),
  },
  {
    value: 'micros',
    text: i18n.translate('xpack.indexLifecycleMgmt.hotPhase.microsecondsLabel', {
      defaultMessage: 'microseconds',
    }),
  },
  {
    value: 'nanos',
    text: i18n.translate('xpack.indexLifecycleMgmt.hotPhase.nanosecondsLabel', {
      defaultMessage: 'nanoseconds',
    }),
  },
];
