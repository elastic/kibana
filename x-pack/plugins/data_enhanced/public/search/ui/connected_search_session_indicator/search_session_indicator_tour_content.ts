/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

import { SearchSessionState } from '../../../../../../../src/plugins/data/public/';

export interface TourStepMessage {
  storageKey: string;
  title: string;
  message: string;
  delay?: number;
}

export const TOUR_MESSAGES: Record<string, TourStepMessage> = {
  [SearchSessionState.Loading]: {
    storageKey: 'data.searchSessiosn.tour.slowSearch',
    title: i18n.translate('xpack.data.searchSessionIndicator.slowSearchTitle', {
      defaultMessage: 'It seems like your search is taking awhile',
    }),
    message: i18n.translate('xpack.data.searchSessionIndicator.slowSearchMessage', {
      defaultMessage:
        'Click on this icon to either cancel and re-adjust your configuration or to continue running this search in the background. You can get back to the results from the Advanced Settings > Search Sessions menu.',
    }),
    delay: 5000,
  },
  [SearchSessionState.BackgroundCompleted]: {
    storageKey: 'data.searchSessiosn.tour.backgroundComplete',
    title: i18n.translate('xpack.data.searchSessionIndicator.completeInBackgroundTitle', {
      defaultMessage: 'Your results are ready',
    }),
    message: i18n.translate('xpack.data.searchSessionIndicator.completeInBackgroundMessage', {
      defaultMessage:
        'Your results are now complete and saved. You can get back to the results at a later time from the Advanced Settings > Search Sessions menu.',
    }),
  },
  [SearchSessionState.Restored]: {
    storageKey: 'data.searchSessiosn.tour.restored',
    title: i18n.translate('xpack.data.searchSessionIndicator.completeInBackgroundTitle', {
      defaultMessage: 'Your results were restored',
    }),
    message: i18n.translate('xpack.data.searchSessionIndicator.completeInBackgroundMessage', {
      defaultMessage:
        'Your results were restored. You can get back to the results at a later time from the Advanced Settings > Search Sessions menu.',
    }),
  },
};
