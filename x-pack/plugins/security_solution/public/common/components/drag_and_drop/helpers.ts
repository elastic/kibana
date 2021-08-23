/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { DropResult } from 'react-beautiful-dnd';
import { Dispatch } from 'redux';
import { ActionCreator } from 'typescript-fsa';
import { getProviderIdFromDraggable } from '@kbn/securitysolution-t-grid';

import {
  ALERT_RULE_CREATED_BY,
  ALERT_RULE_DESCRIPTION,
  ALERT_RULE_ENABLED,
  ALERT_RULE_FROM,
  ALERT_RULE_UUID,
  ALERT_RULE_INTERVAL,
  ALERT_RULE_NAME,
  ALERT_RULE_NOTE,
  ALERT_RULE_REFERENCES,
  ALERT_RULE_RISK_SCORE,
  ALERT_RULE_RULE_ID,
  ALERT_RULE_SEVERITY,
  ALERT_RULE_TAGS,
  ALERT_RULE_TO,
  ALERT_RULE_TYPE,
  ALERT_RULE_UPDATED_BY,
  ALERT_RULE_VERSION,
  ALERT_WORKFLOW_STATUS,
} from '@kbn/rule-data-utils';
import { BrowserField } from '../../containers/source';
import { dragAndDropActions } from '../../store/actions';
import { IdToDataProvider } from '../../store/drag_and_drop/model';
import { addContentToTimeline } from '../../../timelines/components/timeline/data_providers/helpers';
import { DataProvider } from '../../../timelines/components/timeline/data_providers/data_provider';
import {
  ALERT_ANCESTORS_DEPTH,
  ALERT_ANCESTORS_ID,
  ALERT_ANCESTORS_INDEX,
  ALERT_ANCESTORS_RULE,
  ALERT_ANCESTORS_TYPE,
  ALERT_ORIGINAL_EVENT_ACTION,
  ALERT_ORIGINAL_EVENT_CATEGORY,
  ALERT_ORIGINAL_EVENT_CODE,
  ALERT_ORIGINAL_EVENT_CREATED,
  ALERT_ORIGINAL_EVENT_DATASET,
  ALERT_ORIGINAL_EVENT_DURATION,
  ALERT_ORIGINAL_EVENT_END,
  ALERT_ORIGINAL_EVENT_HASH,
  ALERT_ORIGINAL_EVENT_ID,
  ALERT_ORIGINAL_EVENT_KIND,
  ALERT_ORIGINAL_EVENT_MODULE,
  ALERT_ORIGINAL_EVENT_ORIGINAL,
  ALERT_ORIGINAL_EVENT_OUTCOME,
  ALERT_ORIGINAL_EVENT_PROVIDER,
  ALERT_ORIGINAL_EVENT_RISK_SCORE,
  ALERT_ORIGINAL_EVENT_RISK_SCORE_NORM,
  ALERT_ORIGINAL_EVENT_SEQUENCE,
  ALERT_ORIGINAL_EVENT_SEVERITY,
  ALERT_ORIGINAL_EVENT_START,
  ALERT_ORIGINAL_EVENT_TIMEZONE,
  ALERT_ORIGINAL_EVENT_TYPE,
  ALERT_ORIGINAL_TIME,
  ALERT_RULE_FALSE_POSITIVES,
  ALERT_RULE_FILTERS,
  ALERT_RULE_IMMUTABLE,
  ALERT_RULE_INDEX,
  ALERT_RULE_LANGUAGE,
  ALERT_RULE_MAX_SIGNALS,
  ALERT_RULE_OUTPUT_INDEX,
  ALERT_RULE_QUERY,
  ALERT_RULE_SAVED_ID,
  ALERT_RULE_SIZE,
  ALERT_RULE_THREAT,
  ALERT_RULE_THREAT_TACTIC_ID,
  ALERT_RULE_THREAT_TACTIC_NAME,
  ALERT_RULE_THREAT_TACTIC_REFERENCE,
  ALERT_RULE_THREAT_TECHNIQUE_ID,
  ALERT_RULE_THREAT_TECHNIQUE_NAME,
  ALERT_RULE_THREAT_TECHNIQUE_REFERENCE,
  ALERT_RULE_TIMELINE_ID,
  ALERT_RULE_TIMELINE_TITLE,
} from '../../../../../timelines/common/alerts';

export {
  draggableIdPrefix,
  droppableIdPrefix,
  draggableContentPrefix,
  draggableTimelineProvidersPrefix,
  draggableFieldPrefix,
  draggableIsField,
  droppableContentPrefix,
  droppableFieldPrefix,
  droppableTimelineProvidersPrefix,
  droppableTimelineColumnsPrefix,
  droppableTimelineFlyoutBottomBarPrefix,
  getDraggableId,
  getDraggableFieldId,
  getTimelineProviderDroppableId,
  getTimelineProviderDraggableId,
  getDroppableId,
  sourceIsContent,
  sourceAndDestinationAreSameTimelineProviders,
  draggableIsContent,
  reasonIsDrop,
  destinationIsTimelineProviders,
  destinationIsTimelineColumns,
  destinationIsTimelineButton,
  getProviderIdFromDraggable,
  getFieldIdFromDraggable,
  escapeDataProviderId,
  escapeContextId,
  escapeFieldId,
  unEscapeFieldId,
  providerWasDroppedOnTimeline,
  userIsReArrangingProviders,
  fieldWasDroppedOnTimelineColumns,
  DRAG_TYPE_FIELD,
  IS_TIMELINE_FIELD_DRAGGING_CLASS_NAME,
} from '@kbn/securitysolution-t-grid';
interface AddProviderToTimelineParams {
  activeTimelineDataProviders: DataProvider[];
  dataProviders: IdToDataProvider;
  dispatch: Dispatch;
  noProviderFound?: ActionCreator<{
    id: string;
  }>;
  onAddedToTimeline: (fieldOrValue: string) => void;
  result: DropResult;
  timelineId: string;
}

export const addProviderToTimeline = ({
  activeTimelineDataProviders,
  dataProviders,
  dispatch,
  result,
  timelineId,
  noProviderFound = dragAndDropActions.noProviderFound,
  onAddedToTimeline,
}: AddProviderToTimelineParams): void => {
  const providerId = getProviderIdFromDraggable(result);
  const providerToAdd = dataProviders[providerId];

  if (providerToAdd) {
    addContentToTimeline({
      dataProviders: activeTimelineDataProviders,
      destination: result.destination,
      dispatch,
      onAddedToTimeline,
      providerToAdd,
      timelineId,
    });
  } else {
    dispatch(noProviderFound({ id: providerId }));
  }
};

export const allowTopN = ({
  browserField,
  fieldName,
  hideTopN,
}: {
  browserField: Partial<BrowserField> | undefined;
  fieldName: string;
  hideTopN: boolean;
}): boolean => {
  const isAggregatable = browserField?.aggregatable ?? false;
  const fieldType = browserField?.type ?? '';
  const isAllowedType = [
    'boolean',
    'geo-point',
    'geo-shape',
    'ip',
    'keyword',
    'number',
    'numeric',
    'string',
  ].includes(fieldType);

  // TODO: remove this explicit allowlist when the ECS documentation includes alerts
  const isAllowlistedNonBrowserField = ([
    ALERT_ANCESTORS_DEPTH,
    ALERT_ANCESTORS_ID,
    ALERT_ANCESTORS_INDEX,
    ALERT_ANCESTORS_RULE,
    ALERT_ANCESTORS_TYPE,
    ALERT_ORIGINAL_EVENT_ACTION,
    ALERT_ORIGINAL_EVENT_CATEGORY,
    ALERT_ORIGINAL_EVENT_CODE,
    ALERT_ORIGINAL_EVENT_CREATED,
    ALERT_ORIGINAL_EVENT_DATASET,
    ALERT_ORIGINAL_EVENT_DURATION,
    ALERT_ORIGINAL_EVENT_END,
    ALERT_ORIGINAL_EVENT_HASH,
    ALERT_ORIGINAL_EVENT_ID,
    ALERT_ORIGINAL_EVENT_KIND,
    ALERT_ORIGINAL_EVENT_MODULE,
    ALERT_ORIGINAL_EVENT_ORIGINAL,
    ALERT_ORIGINAL_EVENT_OUTCOME,
    ALERT_ORIGINAL_EVENT_PROVIDER,
    ALERT_ORIGINAL_EVENT_RISK_SCORE,
    ALERT_ORIGINAL_EVENT_RISK_SCORE_NORM,
    ALERT_ORIGINAL_EVENT_SEQUENCE,
    ALERT_ORIGINAL_EVENT_SEVERITY,
    ALERT_ORIGINAL_EVENT_START,
    ALERT_ORIGINAL_EVENT_TIMEZONE,
    ALERT_ORIGINAL_EVENT_TYPE,
    ALERT_ORIGINAL_TIME,
    ALERT_RULE_CREATED_BY,
    ALERT_RULE_DESCRIPTION,
    ALERT_RULE_ENABLED,
    ALERT_RULE_FALSE_POSITIVES,
    ALERT_RULE_FILTERS,
    ALERT_RULE_FROM,
    ALERT_RULE_UUID,
    ALERT_RULE_IMMUTABLE,
    ALERT_RULE_INDEX,
    ALERT_RULE_INTERVAL,
    ALERT_RULE_LANGUAGE,
    ALERT_RULE_MAX_SIGNALS,
    ALERT_RULE_NAME,
    ALERT_RULE_NOTE,
    ALERT_RULE_OUTPUT_INDEX,
    ALERT_RULE_QUERY,
    ALERT_RULE_REFERENCES,
    ALERT_RULE_RISK_SCORE,
    ALERT_RULE_RULE_ID,
    ALERT_RULE_SAVED_ID,
    ALERT_RULE_SEVERITY,
    ALERT_RULE_SIZE,
    ALERT_RULE_TAGS,
    ALERT_RULE_THREAT,
    ALERT_RULE_THREAT_TACTIC_ID,
    ALERT_RULE_THREAT_TACTIC_NAME,
    ALERT_RULE_THREAT_TACTIC_REFERENCE,
    ALERT_RULE_THREAT_TECHNIQUE_ID,
    ALERT_RULE_THREAT_TECHNIQUE_NAME,
    ALERT_RULE_THREAT_TECHNIQUE_REFERENCE,
    ALERT_RULE_TIMELINE_ID,
    ALERT_RULE_TIMELINE_TITLE,
    ALERT_RULE_TO,
    ALERT_RULE_TYPE,
    ALERT_RULE_UPDATED_BY,
    ALERT_RULE_VERSION,
    ALERT_WORKFLOW_STATUS,
  ] as string[]).includes(fieldName);

  if (hideTopN) {
    return false;
  }

  return isAllowlistedNonBrowserField || (isAggregatable && isAllowedType);
};
