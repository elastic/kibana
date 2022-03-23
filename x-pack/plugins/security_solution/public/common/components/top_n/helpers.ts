/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Filter } from '@kbn/es-query';
import {
  ALERT_ACTION_GROUP,
  ALERT_BUILDING_BLOCK_TYPE,
  ALERT_DURATION,
  ALERT_END,
  ALERT_EVALUATION_THRESHOLD,
  ALERT_EVALUATION_VALUE,
  ALERT_INSTANCE_ID,
  ALERT_NAMESPACE,
  ALERT_REASON,
  ALERT_RISK_SCORE,
  ALERT_RULE_AUTHOR,
  ALERT_RULE_CATEGORY,
  ALERT_RULE_CONSUMER,
  ALERT_RULE_CREATED_AT,
  ALERT_RULE_CREATED_BY,
  ALERT_RULE_DESCRIPTION,
  ALERT_RULE_ENABLED,
  ALERT_RULE_FROM,
  ALERT_RULE_INTERVAL,
  ALERT_RULE_LICENSE,
  ALERT_RULE_NAME,
  ALERT_RULE_NAMESPACE,
  ALERT_RULE_NOTE,
  ALERT_RULE_PARAMETERS,
  ALERT_RULE_PRODUCER,
  ALERT_RULE_REFERENCES,
  ALERT_RULE_RULE_ID,
  ALERT_RULE_RULE_NAME_OVERRIDE,
  ALERT_RULE_TAGS,
  ALERT_RULE_TO,
  ALERT_RULE_TYPE,
  ALERT_RULE_TYPE_ID,
  ALERT_RULE_UPDATED_AT,
  ALERT_RULE_UPDATED_BY,
  ALERT_RULE_UUID,
  ALERT_RULE_VERSION,
  ALERT_SEVERITY,
  ALERT_START,
  ALERT_STATUS,
  ALERT_SYSTEM_STATUS,
  ALERT_UUID,
  ALERT_WORKFLOW_REASON,
  ALERT_WORKFLOW_STATUS,
  ALERT_WORKFLOW_USER,
} from '@kbn/rule-data-utils';

import { TimelineEventsType, TimelineId } from '../../../../common/types/timeline';
import { SourcererScopeName } from '../../store/sourcerer/model';

import * as i18n from './translations';

export interface TopNOption {
  inputDisplay: string;
  value: TimelineEventsType;
  'data-test-subj': string;
}

/** A (stable) array containing only the 'All events' option */
export const allEvents: TopNOption[] = [
  {
    value: 'all',
    inputDisplay: i18n.ALL_EVENTS,
    'data-test-subj': 'option-all',
  },
];

/** A (stable) array containing only the 'Raw events' option */
export const rawEvents: TopNOption[] = [
  {
    value: 'raw',
    inputDisplay: i18n.RAW_EVENTS,
    'data-test-subj': 'option-raw',
  },
];

/** A (stable) array containing only the 'Alert events' option */
export const alertEvents: TopNOption[] = [
  {
    value: 'alert',
    inputDisplay: i18n.ALERT_EVENTS,
    'data-test-subj': 'option-alert',
  },
];

/** A (stable) array containing the default Top N options */
export const defaultOptions = [...rawEvents, ...alertEvents];

/**
 * Returns the options to be displayed in a Top N view select. When
 * an `activeTimelineEventType` is provided, an array containing
 * just one option (corresponding to `activeTimelineEventType`)
 * will be returned, to ensure the data displayed in the Top N
 * is always in sync with the `EventType` chosen by the user in
 * the active timeline.
 */
export const getOptions = (activeTimelineEventsType?: TimelineEventsType): TopNOption[] => {
  switch (activeTimelineEventsType) {
    case 'all':
      return allEvents;
    case 'raw':
      return rawEvents;
    case 'alert':
      return alertEvents;
    default:
      return defaultOptions;
  }
};

/** returns true if the specified timelineId is a detections alert table */
export const isDetectionsAlertsTable = (timelineId: string | undefined): boolean =>
  timelineId === TimelineId.detectionsPage || timelineId === TimelineId.detectionsRulesDetailsPage;

/**
 * The following fields are used to filter alerts tables, (i.e. tables in the
 * `Security > Alert` and `Security > Rule > Details` pages). These fields,
 * MUST be ignored when showing Top N alerts for `raw` documents, because
 * the raw documents don't include them.
 */
export const IGNORED_ALERT_FILTERS = [
  ALERT_ACTION_GROUP,
  ALERT_BUILDING_BLOCK_TYPE, // an "Additional filters" option on the alerts table
  ALERT_DURATION,
  ALERT_END,
  ALERT_EVALUATION_THRESHOLD,
  ALERT_EVALUATION_VALUE,
  ALERT_INSTANCE_ID,
  ALERT_NAMESPACE,
  ALERT_RULE_NAMESPACE,
  ALERT_RULE_CONSUMER,
  ALERT_RULE_PRODUCER,
  ALERT_REASON,
  ALERT_RISK_SCORE,
  ALERT_STATUS,
  ALERT_WORKFLOW_REASON,
  ALERT_WORKFLOW_STATUS, // open | acknowledged | closed filter
  ALERT_WORKFLOW_USER,
  ALERT_RULE_AUTHOR,
  ALERT_RULE_CREATED_AT,
  ALERT_RULE_CREATED_BY,
  ALERT_RULE_DESCRIPTION,
  ALERT_RULE_ENABLED,
  ALERT_RULE_FROM,
  ALERT_RULE_INTERVAL,
  ALERT_RULE_LICENSE,
  ALERT_RULE_NAME, // not a built-in view filter, but frequently applied via the `Filter In` and `Filter Out` actions
  ALERT_RULE_NOTE,
  ALERT_RULE_PARAMETERS,
  ALERT_RULE_REFERENCES,
  ALERT_RULE_RULE_ID, // filters alerts to a single rule on the Security > Rules > details pages
  ALERT_RULE_RULE_NAME_OVERRIDE,
  ALERT_RULE_TAGS,
  ALERT_RULE_TO,
  ALERT_RULE_TYPE,
  ALERT_RULE_TYPE_ID,
  ALERT_RULE_UPDATED_AT,
  ALERT_RULE_UPDATED_BY,
  ALERT_RULE_UUID,
  ALERT_RULE_CATEGORY,
  ALERT_RULE_VERSION,
  ALERT_SEVERITY,
  ALERT_START,
  ALERT_SYSTEM_STATUS,
  ALERT_UUID,
  'signal.rule.building_block_type',
  'signal.rule.id',
  'signal.rule.name',
  'signal.rule.threat_mapping',
  'signal.status',
];

/**
 * returns true if the Top N query should ignore filters specific to alerts
 * when querying raw documents
 *
 * @see IGNORED_ALERT_FILTERS
 */
export const shouldIgnoreAlertFilters = ({
  timelineId,
  view,
}: {
  timelineId: string | undefined;
  view: TimelineEventsType;
}): boolean => view === 'raw' && isDetectionsAlertsTable(timelineId);

/**
 * returns a new set of `filters` that don't contain the fields specified in
 * `IGNORED_ALERT_FILTERS` when they should be ignored
 *
 * @see IGNORED_ALERT_FILTERS
 */
export const removeIgnoredAlertFilters = ({
  filters,
  timelineId,
  view,
}: {
  filters: Filter[];
  timelineId: string | undefined;
  view: TimelineEventsType;
}): Filter[] => {
  if (!shouldIgnoreAlertFilters({ timelineId, view })) {
    return filters; // unmodified filters
  }

  return filters.filter((x) => !IGNORED_ALERT_FILTERS.includes(`${x.meta.key}`));
};

/** returns the SourcererScopeName applicable to the specified timelineId and view */
export const getSourcererScopeName = ({
  timelineId,
  view,
}: {
  timelineId: string | undefined;
  view: TimelineEventsType;
}): SourcererScopeName => {
  // When alerts should be ignored, use the `default` Sourcerer scope,
  // because it does NOT include alert indexes:
  if (shouldIgnoreAlertFilters({ timelineId, view })) {
    return SourcererScopeName.default; // no alerts in this scope
  }

  if (isDetectionsAlertsTable(timelineId)) {
    return SourcererScopeName.detections;
  }

  if (timelineId === TimelineId.active) {
    return SourcererScopeName.timeline;
  }

  return SourcererScopeName.default;
};
