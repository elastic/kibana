/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type React from 'react';
import type { IconType } from '@elastic/eui';
import type { LicenseType } from '@kbn/licensing-plugin/public';
import type { OnboardingHubCardId } from './constants';
import type { RequiredCapabilities } from '../common/lib/capabilities';

export type OnboardingCardComponent = React.FunctionComponent<{
  setComplete: (complete: boolean) => void;
}>;

export type OnboardingCardCheckComplete = () => Promise<boolean>;

export interface OnboardingCardConfig {
  id: OnboardingHubCardId;
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
  checkComplete?: () => Promise<boolean>;
  /**
   * Capabilities strings using object dot notation to enable the card. e.g. ['siem.crud']
   *
   * The format of defining capabilities supports OR and AND mechanism. To specify capabilities in an OR fashion
   * they can be defined in a single level array like: [requiredCap1, requiredCap2]. If either of these capabilities
   * is satisfied the link would be included. To require that the capabilities be AND'd together a second level array
   * can be specified: [cap1, [cap2, cap3]] this would result in cap1 || (cap2 && cap3). To specify
   * capabilities that all must be and'd together an example would be: [[cap1, cap2]], this would result in the boolean
   * operation cap1 && cap2.
   *
   * The final format is to specify a single capability, this would be like: capabilities: cap1, which is the same as
   * capabilities: [cap1]
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
