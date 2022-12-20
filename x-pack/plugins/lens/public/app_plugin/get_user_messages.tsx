/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { VisualizationState } from '../state_management';
import { UserMessage, VisualizationMap } from '../types';

/**
 * Provides a place to register general user messages that don't belong in the datasource or visualization objects
 */
export const getApplicationUserMessages = ({
  visualization,
  visualizationMap,
}: {
  visualization: VisualizationState;
  visualizationMap: VisualizationMap;
}): UserMessage[] => {
  const messages: UserMessage[] = [];

  if (visualization.activeId && !visualizationMap[visualization.activeId]) {
    messages.push(getUnknownVisualizationTypeError(visualization.activeId));
  }

  return messages;
};

export function getUnknownVisualizationTypeError(visType: string): UserMessage {
  return {
    severity: 'error',
    fixableInEditor: false,
    displayLocations: [{ id: 'workspace' }, { id: 'suggestionPanel' }],
    shortMessage: i18n.translate('xpack.lens.unknownVisType.shortMessage', {
      defaultMessage: `Unknown visualization type`,
    }),
    longMessage: i18n.translate('xpack.lens.unknownVisType.longMessage', {
      defaultMessage: `The visualization type {visType} could not be resolved.`,
      values: {
        visType,
      },
    }),
  };
}
