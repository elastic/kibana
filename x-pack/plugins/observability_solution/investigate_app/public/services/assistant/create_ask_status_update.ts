/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import {
  TimelineAskStatusUpdate,
  TimelineAskStatusUpdateType,
  TimelineAskUpdateType,
} from './types';

function getMessage(type: TimelineAskStatusUpdateType) {
  switch (type) {
    case TimelineAskStatusUpdateType.CollectingContext:
      return i18n.translate('xpack.investigateApp.assistantAsk.collectingContext', {
        defaultMessage: 'Collecting context',
      });

    case TimelineAskStatusUpdateType.AnalyzingVisualizations:
      return i18n.translate('xpack.investigateApp.assistantAsk.analyzingVisualizations', {
        defaultMessage: 'Finding relevant visualizations and datasets',
      });

    case TimelineAskStatusUpdateType.GeneratingWidgets:
      return i18n.translate('xpack.investigateApp.assistantAsk.statusUpdateGeneratingWidgets', {
        defaultMessage: 'Generating widgets',
      });
  }
}

export function createAskStatusUpdate(type: TimelineAskStatusUpdateType): TimelineAskStatusUpdate {
  return {
    type: TimelineAskUpdateType.Status,
    status: {
      type,
      message: getMessage(type),
    },
  };
}
