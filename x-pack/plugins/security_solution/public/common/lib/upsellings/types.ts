/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SecurityPageName } from '../../../../common';

export type PageUpsellings = Partial<Record<SecurityPageName, React.ComponentType>>;
export type MessageUpsellings = Partial<Record<UpsellingMessageId, string>>;
export type SectionUpsellings = Partial<Record<UpsellingSectionId, React.ComponentType>>;

export type UpsellingSectionId =
  | 'entity_analytics_panel'
  | 'endpointPolicyProtections'
  | 'osquery_automated_response_actions';

export type UpsellingMessageId = 'investigation_guide';
