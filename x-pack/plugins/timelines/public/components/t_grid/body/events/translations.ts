/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const YOU_ARE_IN_AN_EVENT_RENDERER = (row: number) =>
  i18n.translate('xpack.timelines.timeline.youAreInAnEventRendererScreenReaderOnly', {
    values: { row },
    defaultMessage:
      'You are in an event renderer for row: {row}. Press the up arrow key to exit and return to the current row, or the down arrow key to exit and advance to the next row.',
  });
