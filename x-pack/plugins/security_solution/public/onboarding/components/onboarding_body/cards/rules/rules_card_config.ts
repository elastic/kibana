/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import installRulesImageSrc from './images/install_rule.png';
import type { RulesCardSelectorListItem } from './types';
import { RulesCardItemId } from './types';
import { CardSelectorListItemAssetType } from '../types';
import type { CardSelectorListItem } from '../common/card_selector_list';

const VIDEO_SOURCE = '//play.vidyard.com/K6kKDBbP9SpXife9s2tHNP.html?autoplay=1';

export const RULES_CARD_ITEMS: RulesCardSelectorListItem[] = [
  {
    id: RulesCardItemId.install,
    title: i18n.translate('xpack.securitySolution.onboarding.rulesCards.install.title', {
      defaultMessage: 'Install Elastic rules',
    }),
    description: i18n.translate(
      'xpack.securitySolution.onboarding.rulesCards.install.description',
      {
        defaultMessage: 'Quickly add and enable the rules you need with Elastic’s prebuilt rules',
      }
    ),
    asset: {
      type: CardSelectorListItemAssetType.image,
      source: installRulesImageSrc,
      alt: i18n.translate('xpack.securitySolution.onboarding.rulesCards.install.description', {
        defaultMessage: 'Quickly add and enable the rules you need with Elastic’s prebuilt rules',
      }),
    },
  },
  {
    id: RulesCardItemId.create,
    title: i18n.translate('xpack.securitySolution.onboarding.rulesCards.create.title', {
      defaultMessage: 'Create a custom rule',
    }),
    description: i18n.translate('xpack.securitySolution.onboarding.rulesCards.create.description', {
      defaultMessage: 'Create a custom detection rule for local or remote data',
    }),
    asset: {
      type: CardSelectorListItemAssetType.video,
      source: VIDEO_SOURCE,
      alt: i18n.translate('xpack.securitySolution.onboarding.rulesCards.create.description', {
        defaultMessage: 'Create a custom detection rule for local or remote data',
      }),
    },
  },
];

export const RULES_CARD_ITEMS_BY_ID = Object.fromEntries(
  RULES_CARD_ITEMS.map((card) => [card.id, card])
) as Record<RulesCardSelectorListItem['id'], RulesCardSelectorListItem>;

export const RULES_CARD_SELECTOR_ITEMS = RULES_CARD_ITEMS.map<CardSelectorListItem>(
  (rulesItem) => ({
    id: rulesItem.id,
    title: rulesItem.title,
    description: rulesItem.description,
  })
);
