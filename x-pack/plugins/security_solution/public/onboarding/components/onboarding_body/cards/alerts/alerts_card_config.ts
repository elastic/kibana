/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import alertTimelineImageSrc from './images/alert_timeline.png';
import sessionViewImageSrc from './images/session_view.png';
import type { AlertsCardSelectorListItem } from './types';
import { AlertsCardItemId } from './types';
import { CardSelectorListItemAssetType } from '../types';
import type { CardSelectorListItem } from '../common/card_selector_list';

const VIDEO_SOURCE = '//play.vidyard.com/K6kKDBbP9SpXife9s2tHNP.html?autoplay=1';

export const ALERTS_CARD_ITEMS: AlertsCardSelectorListItem[] = [
  {
    id: AlertsCardItemId.list,
    title: i18n.translate('xpack.securitySolution.onboarding.alertsCards.details.title', {
      defaultMessage: 'Alert list and details',
    }),
    description: i18n.translate(
      'xpack.securitySolution.onboarding.alertsCards.details.description',
      {
        defaultMessage: 'Sort through alerts and drill down into its details',
      }
    ),
    asset: {
      type: CardSelectorListItemAssetType.video,
      source: VIDEO_SOURCE,
      alt: i18n.translate('xpack.securitySolution.onboarding.alertsCards.details.description', {
        defaultMessage: 'Sort through alerts and drill down into its details',
      }),
    },
  },
  {
    id: AlertsCardItemId.timeline,
    title: i18n.translate('xpack.securitySolution.onboarding.alertsCards.timeline.title', {
      defaultMessage: 'Investigate in Timeline',
    }),
    description: i18n.translate(
      'xpack.securitySolution.onboarding.alertsCards.timeline.description',
      {
        defaultMessage: 'Streamline alert investigation with real-time visualization',
      }
    ),
    asset: {
      type: CardSelectorListItemAssetType.image,
      source: alertTimelineImageSrc,
      alt: i18n.translate('xpack.securitySolution.onboarding.alertsCards.timeline.description', {
        defaultMessage: 'Streamline alert investigation with real-time visualization',
      }),
    },
  },
  {
    id: AlertsCardItemId.analyzer,
    title: i18n.translate('xpack.securitySolution.onboarding.alertsCards.analyzer.title', {
      defaultMessage: 'Investigate in Analyzer',
    }),
    description: i18n.translate(
      'xpack.securitySolution.onboarding.alertsCards.analyzer.description',
      {
        defaultMessage: 'Simplify alert analysis by visualizing threat detection processes',
      }
    ),
    asset: {
      type: CardSelectorListItemAssetType.video,
      source: VIDEO_SOURCE,
      alt: i18n.translate('xpack.securitySolution.onboarding.alertsCards.analyzer.description', {
        defaultMessage: 'Simplify alert analysis by visualizing threat detection processes',
      }),
    },
  },
  {
    id: AlertsCardItemId.sessionView,
    title: i18n.translate('xpack.securitySolution.onboarding.alertsCards.sessionView.title', {
      defaultMessage: 'Investigate in Session View',
    }),
    description: i18n.translate(
      'xpack.securitySolution.onboarding.alertsCards.sessionView.description',
      {
        defaultMessage: 'Centralized threat analysis and response with real-time data insights',
      }
    ),
    asset: {
      type: CardSelectorListItemAssetType.image,
      source: sessionViewImageSrc,
      alt: i18n.translate('xpack.securitySolution.onboarding.alertsCards.sessionView.description', {
        defaultMessage: 'Centralized threat analysis and response with real-time data insights',
      }),
    },
  },
];

export const ALERTS_CARD_ITEMS_BY_ID = Object.fromEntries(
  ALERTS_CARD_ITEMS.map((card) => [card.id, card])
) as Record<AlertsCardSelectorListItem['id'], AlertsCardSelectorListItem>;

export const ALERTS_CARD_SELECTOR_ITEMS = ALERTS_CARD_ITEMS.map<CardSelectorListItem>(
  (alertsItem) => ({
    id: alertsItem.id,
    title: alertsItem.title,
    description: alertsItem.description,
  })
);
