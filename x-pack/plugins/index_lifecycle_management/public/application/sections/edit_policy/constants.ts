/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { PhaseWithDownsample } from '../../../../common/types';

export const isUsingCustomRolloverPath = '_meta.hot.customRollover.enabled';

export const isUsingDefaultRolloverPath = '_meta.hot.isUsingDefaultRollover';

export const isUsingDownsamplePath = (phase: PhaseWithDownsample) =>
  `_meta.${phase}.downsample.enabled`;

/**
 * These strings describe the path to their respective values in the serialized
 * ILM form.
 */
export const ROLLOVER_FORM_PATHS = {
  maxDocs: 'phases.hot.actions.rollover.max_docs',
  maxAge: 'phases.hot.actions.rollover.max_age',
  maxSize: 'phases.hot.actions.rollover.max_size',
  maxPrimaryShardSize: 'phases.hot.actions.rollover.max_primary_shard_size',
  maxPrimaryShardDocs: 'phases.hot.actions.rollover.max_primary_shard_docs',
};

/**
 * This repository is provisioned by Elastic Cloud and will always
 * exist as a "managed" repository.
 */
export const CLOUD_DEFAULT_REPO = 'found-snapshots';

/*
 * Labels for byte size units
 */
export const byteSizeUnits = [
  {
    value: 'gb',
    text: i18n.translate('xpack.indexLifecycleMgmt.editPolicy.byteSizeUnits.gigabytesLabel', {
      defaultMessage: 'gigabytes',
    }),
  },
  {
    value: 'mb',
    text: i18n.translate('xpack.indexLifecycleMgmt.editPolicy.byteSizeUnits.megabytesLabel', {
      defaultMessage: 'megabytes',
    }),
  },
  {
    value: 'b',
    text: i18n.translate('xpack.indexLifecycleMgmt.editPolicy.byteSizeUnits.bytesLabel', {
      defaultMessage: 'bytes',
    }),
  },
  {
    value: 'kb',
    text: i18n.translate('xpack.indexLifecycleMgmt.editPolicy.byteSizeUnits.kilobytesLabel', {
      defaultMessage: 'kilobytes',
    }),
  },
  {
    value: 'tb',
    text: i18n.translate('xpack.indexLifecycleMgmt.editPolicy.byteSizeUnits.terabytesLabel', {
      defaultMessage: 'terabytes',
    }),
  },
  {
    value: 'pb',
    text: i18n.translate('xpack.indexLifecycleMgmt.editPolicy.byteSizeUnits.petabytesLabel', {
      defaultMessage: 'petabytes',
    }),
  },
];

/*
 * Labels for time units
 */
export const timeUnits = [
  {
    value: 'd',
    text: i18n.translate('xpack.indexLifecycleMgmt.editPolicy.timeUnits.daysLabel', {
      defaultMessage: 'days',
    }),
  },
  {
    value: 'h',
    text: i18n.translate('xpack.indexLifecycleMgmt.editPolicy.timeUnits.hoursLabel', {
      defaultMessage: 'hours',
    }),
  },
  {
    value: 'm',
    text: i18n.translate('xpack.indexLifecycleMgmt.editPolicy.timeUnits.minutesLabel', {
      defaultMessage: 'minutes',
    }),
  },
];
