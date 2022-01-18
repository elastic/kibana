/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const ADD_TO_TIMELINE = i18n.translate('xpack.timelines.hoverActions.addToTimeline', {
  defaultMessage: 'Add to timeline investigation',
});

export const ADDED_TO_TIMELINE_OR_TEMPLATE_MESSAGE = (fieldOrValue: string, isTimeline: boolean) =>
  i18n.translate('xpack.timelines.hoverActions.addToTimeline.addedFieldMessage', {
    values: { fieldOrValue, isTimeline },
    defaultMessage: `Added {fieldOrValue} to {isTimeline, select, true {timeline} false {template}}`,
  });
