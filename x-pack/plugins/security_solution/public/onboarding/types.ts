/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IconType } from '@elastic/eui';
import type { LicenseType } from '@kbn/licensing-plugin/public';
import type { OnboardingHubCardId } from './constants';
import type { RequiredCapabilities } from '../common/lib/capabilities';

export type OnboardingHubCardComponent = React.ComponentType<{
  setComplete: (complete: boolean) => void;
}>;

export type OnboardingHubCardCheckComplete = () => Promise<boolean>;

export interface OnboardingHubCardConfig {
  id: OnboardingHubCardId;
  title: string; // i18n
  icon: IconType;
  /**
   * Component to render the card
   */
  component: React.ComponentType<{ setComplete: (complete: boolean) => void }>; // use React.lazy() to load the component
  /**
   * for auto-checking completion
   * @returns Promise for the complete status
   */
  checkComplete?: () => Promise<boolean>;
  /**
   * Capabilities strings (using object dot notation) to enable the link.
   */
  capabilities?: RequiredCapabilities; // check `x-pack/plugins/security_solution/public/common/lib/capabilities/has_capabilities.ts`
  /**
   * Minimum license required to enable the card
   */
  licenseType?: LicenseType;
}

export interface OnboardingHubGroupConfig {
  title: string;
  cards: OnboardingHubCardConfig[];
}
