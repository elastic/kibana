/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type React from 'react';
import type { IconType } from '@elastic/eui';
import type { LicenseType } from '@kbn/licensing-plugin/public';
import type { OnboardingCardId } from './constants';
import type { RequiredCapabilities } from '../common/lib/capabilities';

export interface CheckCompleteResult {
  /**
   * Optional custom badge text replacement for the card complete badge in the card header.
   */
  completeBadgeText?: string;
  /**
   * Optional badges to prepend to the card complete badge in the card header, regardless of completion status.
   */
  additionalBadges?: React.ReactNode[];
  /**
   * Optional metadata to be passed to the card component.
   */
  metadata?: Record<string, unknown>;
}
/**
 * The result of a card completion auto check.
 * - `true` if the card is complete.
 * - `false` if the card is not complete.
 * - `{ isComplete: true, completeBadgeText: ReactNode }` if the card is complete and has a custom complete badge text.
 * - `{ isComplete: false, additionalBadges: ReactNode[] }` if the card is complete and has to show additional badges on the header.
 * - `{ isComplete: false, metadata: {showWarningCallOut: true} }` if the card is not complete and passes some metadata to the card component.
 */
export type CheckCompleteResponse = boolean | ({ isComplete: boolean } & CheckCompleteResult);

export type SetComplete = (isComplete: boolean) => void;
export type IsCardComplete = (cardId: OnboardingCardId) => boolean;
export type SetExpandedCardId = (
  cardId: OnboardingCardId | null,
  options?: { scroll?: boolean }
) => void;

export type OnboardingCardComponent = React.ComponentType<{
  /**
   * Function to set the current card completion status.
   */
  setComplete: SetComplete;
  /**
   * Function to check if a specific card is complete.
   */
  isCardComplete: IsCardComplete;
  /**
   * Function to expand a specific card ID and scroll to it.
   */
  setExpandedCardId: SetExpandedCardId;
  /**
   * Metadata passed from the card checkComplete function.
   * It will be `undefined` until the first checkComplete call finishes.
   */
  checkCompleteMetadata?: Record<string, unknown>;
}>;

export type OnboardingCardCheckComplete = () => Promise<CheckCompleteResponse>;

export interface OnboardingCardConfig {
  id: OnboardingCardId;
  title: string;
  icon: IconType;
  /**
   * Component that renders the card content when expanded.
   * It receives a `setComplete` function to allow the card to mark itself as complete if needed.
   * Please use React.lazy() to load the component.
   */
  Component: OnboardingCardComponent;
  /**
   * Function for auto-checking completion for the card
   * @returns Promise for the complete status
   */
  checkComplete?: OnboardingCardCheckComplete;
  /**
   * The RBAC capability strings required to enable the card. It uses object dot notation. e.g. `'siem.crud'`.
   *
   * The format of the capabilities property supports OR and AND mechanism:
   *
   * To specify capabilities in an OR fashion, they can be defined in a single level array like: `capabilities: [cap1, cap2]`.
   * If either of "cap1 || cap2" is granted the card will be included.
   *
   * To specify capabilities with AND conditional, use a second level array: `capabilities: [['cap1', 'cap2']]`.
   * This would result in the boolean expression "cap1 && cap2", both capabilities must be granted to include the card.
   *
   * They can also be combined like: `capabilities: ['cap1', ['cap2', 'cap3']]` which would result in the boolean expression "cap1 || (cap2 && cap3)".
   *
   * For the single capability requirement: `capabilities: 'cap1'`, which is the same as `capabilities: ['cap1']`
   *
   * Default is `undefined` (no capabilities required)
   */
  capabilities?: RequiredCapabilities;
  /**
   * Minimum license required to enable the card.
   * Default is `basic`
   */
  licenseType?: LicenseType;
}

export interface OnboardingGroupConfig {
  title: string;
  cards: OnboardingCardConfig[];
}
