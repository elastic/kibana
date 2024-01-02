/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ObservabilitySharedPlugin } from './plugin';
export type {
  ObservabilitySharedPlugin,
  ObservabilitySharedPluginSetup,
  ObservabilitySharedPluginStart,
  ProfilingLocators,
} from './plugin';
export const plugin = () => {
  return new ObservabilitySharedPlugin();
};

export type {
  ObservabilityPageTemplateProps,
  LazyObservabilityPageTemplateProps,
  NavigationSection,
} from './components/page_template/page_template';
export type { NavigationEntry } from './components/page_template/page_template';
export { HeaderMenuPortal } from './components/header_menu';
export { useObservabilityTourContext, observTourStepStorageKey } from './components/tour';
export { ActionMenu, ActionMenuDivider } from './components/action_menu/action_menu';
export {
  Section,
  SectionLink,
  SectionLinks,
  SectionSpacer,
  SectionSubtitle,
  SectionTitle,
} from './components/section/section';
export type { SectionLinkProps } from './components/section/section';
export { LoadWhenInView } from './components/load_when_in_view/get_load_when_in_view_lazy';

export { TechnicalPreviewBadge } from './components/technical_preview_badge/technical_preview_badge';

export { InspectorContextProvider } from './contexts/inspector/inspector_context';
export type { AddInspectorRequest } from './contexts/inspector/inspector_context';
export { useInspectorContext } from './contexts/inspector/use_inspector_context';

export { useTheme } from './hooks/use_theme';
export { useEditableSettings } from './hooks/use_editable_settings';
export { useEsSearch, createEsParams } from './hooks/use_es_search';
export { useFetcher, FETCH_STATUS } from './hooks/use_fetcher';
export type { FetcherResult } from './hooks/use_fetcher';
export { useKibanaSpace } from './hooks/use_kibana_space';
export { useBreadcrumbs } from './hooks/use_breadcrumbs';
export {
  METRIC_TYPE,
  useTrackMetric,
  useUiTracker,
  useTrackPageview,
} from './hooks/use_track_metric';
export type { TrackEvent } from './hooks/use_track_metric';
export { useQuickTimeRanges } from './hooks/use_quick_time_ranges';
export { useTimeZone } from './hooks/use_time_zone';
export { useChartThemes } from './hooks/use_chart_theme';
export { useLinkProps, shouldHandleLinkEvent } from './hooks/use_link_props';
export type { LinkDescriptor, Options as UseLinkPropsOptions } from './hooks/use_link_props';
export { NavigationWarningPromptProvider, Prompt } from './components/navigation_warning_prompt';

export type { ApmIndicesConfig, UXMetrics } from './types';

export { noCasesPermissions, allCasesPermissions } from './utils/cases_permissions';

export {
  type ObservabilityActionContextMenuItemProps,
  getContextMenuItemsFromActions,
} from './services/get_context_menu_items_from_actions';

export {
  observabilityFeatureId,
  observabilityAppId,
  casesFeatureId,
  sloFeatureId,
} from '../common';

export {
  EMBEDDABLE_FLAMEGRAPH,
  EMBEDDABLE_FUNCTIONS,
  EMBEDDABLE_PROFILING_SEARCH_BAR,
  EmbeddableFlamegraph,
  EmbeddableFunctions,
  EmbeddableProfilingSearchBar,
  type EmbeddableProfilingSearchBarProps,
} from './components/profiling/embeddables';

export { ProfilingEmptyState } from './components/profiling/profiling_empty_state';
