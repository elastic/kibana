/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const NIGHTSHIFT_FEATURE_ID = 'nightshift';

/**
 * Outermost availability gate for Nightshift (Technical Preview). Evaluated before the
 * pricing tier, license, and required-plugin checks. Falls back to `false` so self-managed and
 * LaunchDarkly-unreachable deployments stay off during Tech Preview; the controlled rollout is
 * driven from the elastic/kibana-feature-flags repository.
 *
 * Scope is per-deployment, not per-space: it is read through `featureFlags.getBooleanValue$`, so the
 * feature is on or off for the whole Kibana instance. This flag supersedes
 * `streams.significantEventsAvailable` and replaces the removed space-scoped
 * `observability:streamsEnableSignificantEvents(Discovery)` Advanced Settings, so there is no longer
 * a per-space kill switch. Any values previously persisted for those settings (the `config` saved
 * object or `uiSettings.overrides` in kibana.yml) are inert; Kibana ignores unregistered uiSettings
 * keys, so no migration is needed and stale values do not affect gating.
 */
export const NIGHTSHIFT_ENABLED_FLAG = 'nightshift.enabled';

/**
 * Gates whether `EventService.getClient()` (Significant Events) returns the `.rule-events`-backed
 * `RuleEventsClient` instead of the legacy `EventClient`. Read-only; the dual-write to
 * `.rule-events` is unconditional and independent of this flag. Falls back to `false` so reads
 * keep hitting the legacy events data stream until the read migration (nightshift-program#1515)
 * is validated and rolled out.
 */
export const SIGNIFICANT_EVENTS_USE_RULE_EVENTS_READ =
  'nightshift.significant_events.use_rule_events_read';

/** Saved object type registered by `nightshiftSources` and granted by the Nightshift feature. */
export const NIGHTSHIFT_SOURCE_SO_TYPE = 'nightshift-source';

export const NIGHTSHIFT_MANAGE_ENGINES_SUB_FEATURE_ID = 'manage-engines';

/** HTTP `security.authz.requiredPrivileges` tags registered on the Nightshift feature. */
export const NIGHTSHIFT_API_PRIVILEGES = {
  read: 'read_nightshift',
  manage: 'manage_nightshift',
  configure: 'configure_nightshift',
} as const;

/** `capabilities.nightshift.*` keys granted by the feature's `ui:` list. */
export const NIGHTSHIFT_UI_PRIVILEGES = {
  show: 'show',
  manage: 'manage',
  configure: 'configure',
} as const;

export interface INightshiftCapabilities {
  canShow: boolean;
  canManage: boolean;
  canConfigure: boolean;
}

export function getNightshiftCapabilities(
  nightshift: Record<string, unknown> | undefined
): INightshiftCapabilities {
  return {
    canShow: nightshift?.[NIGHTSHIFT_UI_PRIVILEGES.show] === true,
    canManage: nightshift?.[NIGHTSHIFT_UI_PRIVILEGES.manage] === true,
    canConfigure: nightshift?.[NIGHTSHIFT_UI_PRIVILEGES.configure] === true,
  };
}

export {
  MAX_SOURCE_SLUG_LENGTH,
  MAX_SOURCE_SPACE_ID_LENGTH,
  MAX_SOURCE_VIEW_NAME_LENGTH,
  NIGHTSHIFT_SOURCE_VIEW_PREFIX,
  getNightshiftSourceViewName,
  getSourceSlugCandidate,
  getSourceSlugFromTitle,
} from './src/sources/view_name';

export {
  MAX_SOURCE_DESCRIPTION_LENGTH,
  MAX_SOURCE_ESQL_LENGTH,
  MAX_SOURCE_TAG_LENGTH,
  MAX_SOURCE_TAGS,
  MAX_SOURCE_TITLE_LENGTH,
  createSourceRequestSchema,
  listSourcesQuerySchema,
  updateSourceRequestSchema,
  type CreateSourceRequest,
  type DeleteSourceResponse,
  type ListSourcesResponse,
  type NightshiftSource,
  type SourceHealth,
  type SourceInput,
  type SourceMutationResponse,
  type SourceWithHealth,
  type UpdateSourceRequest,
} from './src/sources/schema';

export {
  getSourceCommandQuery,
  hasMultipleSourceIndices,
  validateSourceQuery,
} from './src/sources/validate_source_query';
