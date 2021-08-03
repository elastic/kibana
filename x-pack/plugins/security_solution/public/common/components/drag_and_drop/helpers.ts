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
  ALERT_RULE_ID,
  ALERT_RULE_NAME,
  ALERT_RULE_REFERENCES,
  ALERT_RULE_RISK_SCORE,
  ALERT_RULE_RULE_ID,
  ALERT_RULE_SEVERITY,
  ALERT_RULE_TAGS,
  ALERT_RULE_TO,
  ALERT_RULE_TYPE,
  ALERT_RULE_UPDATED_BY,
  ALERT_RULE_VERSION,
  ALERT_STATUS,
} from '@kbn/rule-data-utils';
import { BrowserField } from '../../containers/source';
import { dragAndDropActions } from '../../store/actions';
import { IdToDataProvider } from '../../store/drag_and_drop/model';
import { addContentToTimeline } from '../../../timelines/components/timeline/data_providers/helpers';
import { DataProvider } from '../../../timelines/components/timeline/data_providers/data_provider';
import {
  ALERT_RULE_TACTIC_ID,
  ALERT_RULE_TACTIC_NAME,
  ALERT_RULE_TACTIC_REFERENCE,
} from './../../../../common/alert_constants';

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
}: {
  browserField: Partial<BrowserField> | undefined;
  fieldName: string;
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
  const isAllowlistedNonBrowserField = [
    'signal.ancestors.depth',
    'signal.ancestors.id',
    'signal.ancestors.rule',
    'signal.ancestors.type',
    'signal.original_event.action',
    'signal.original_event.category',
    'signal.original_event.code',
    'signal.original_event.created',
    'signal.original_event.dataset',
    'signal.original_event.duration',
    'signal.original_event.end',
    'signal.original_event.hash',
    'signal.original_event.id',
    'signal.original_event.kind',
    'signal.original_event.module',
    'signal.original_event.original',
    'signal.original_event.outcome',
    'signal.original_event.provider',
    'signal.original_event.risk_score',
    'signal.original_event.risk_score_norm',
    'signal.original_event.sequence',
    'signal.original_event.severity',
    'signal.original_event.start',
    'signal.original_event.timezone',
    'signal.original_event.type',
    'signal.original_time',
    'signal.parent.depth',
    'signal.parent.id',
    'signal.parent.index',
    'signal.parent.rule',
    'signal.parent.type',
    ALERT_RULE_CREATED_BY,
    ALERT_RULE_DESCRIPTION,
    ALERT_RULE_ENABLED,
    'signal.rule.false_positives',
    'signal.rule.filters',
    ALERT_RULE_FROM,
    ALERT_RULE_ID,
    'signal.rule.immutable',
    'signal.rule.index',
    'signal.rule.interval',
    'signal.rule.language',
    'signal.rule.max_signals',
    ALERT_RULE_NAME,
    'signal.rule.note',
    'signal.rule.output_index',
    'signal.rule.query',
    ALERT_RULE_REFERENCES,
    ALERT_RULE_RISK_SCORE,
    ALERT_RULE_RULE_ID,
    'signal.rule.saved_id',
    ALERT_RULE_SEVERITY,
    'signal.rule.size',
    ALERT_RULE_TAGS,
    'signal.rule.threat',
    ALERT_RULE_TACTIC_ID,
    ALERT_RULE_TACTIC_NAME,
    ALERT_RULE_TACTIC_REFERENCE,
    'signal.rule.threat.technique.id',
    'signal.rule.threat.technique.name',
    'signal.rule.threat.technique.reference',
    'signal.rule.timeline_id',
    'signal.rule.timeline_title',
    ALERT_RULE_TO,
    ALERT_RULE_TYPE,
    ALERT_RULE_UPDATED_BY,
    ALERT_RULE_VERSION,
    ALERT_STATUS,
  ].includes(fieldName);

  return isAllowlistedNonBrowserField || (isAggregatable && isAllowedType);
};
