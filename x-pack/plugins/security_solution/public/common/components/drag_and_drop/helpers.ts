/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { keyBy } from 'lodash/fp';
import type { DropResult } from '@hello-pangea/dnd';
import type { Dispatch } from 'redux';
import type { ActionCreator } from 'typescript-fsa';

import { getFieldIdFromDraggable, getProviderIdFromDraggable } from '@kbn/securitysolution-t-grid';
import { TableId } from '@kbn/securitysolution-data-table';
import { DEFAULT_COLUMN_MIN_WIDTH } from '../../../timelines/components/timeline/body/constants';
import { getScopedActions } from '../../../helpers';
import type { ColumnHeaderOptions } from '../../../../common/types';
import type { BrowserField, BrowserFields } from '../../../../common/search_strategy';
import { dragAndDropActions } from '../../store/actions';
import type { IdToDataProvider } from '../../store/drag_and_drop/model';
import { addContentToTimeline } from '../../../timelines/components/timeline/data_providers/helpers';
import type { DataProvider } from '../../../timelines/components/timeline/data_providers/data_provider';

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
  isAggregatable,
  fieldType,
  fieldName,
  hideTopN,
}: {
  fieldName: string;
  isAggregatable: boolean;
  fieldType: string;
  hideTopN: boolean;
}): boolean => {
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
    'kibana.alert.ancestors.depth',
    'kibana.alert.ancestors.id',
    'kibana.alert.ancestors.rule',
    'kibana.alert.ancestors.type',
    'kibana.alert.original_event.action',
    'kibana.alert.original_event.category',
    'kibana.alert.original_event.code',
    'kibana.alert.original_event.created',
    'kibana.alert.original_event.dataset',
    'kibana.alert.original_event.duration',
    'kibana.alert.original_event.end',
    'kibana.alert.original_event.hash',
    'kibana.alert.original_event.id',
    'kibana.alert.original_event.kind',
    'kibana.alert.original_event.module',
    'kibana.alert.original_event.original',
    'kibana.alert.original_event.outcome',
    'kibana.alert.original_event.provider',
    'kibana.alert.original_event.risk_score',
    'kibana.alert.original_event.risk_score_norm',
    'kibana.alert.original_event.sequence',
    'kibana.alert.original_event.severity',
    'kibana.alert.original_event.start',
    'kibana.alert.original_event.timezone',
    'kibana.alert.original_event.type',
    'kibana.alert.original_time',
    'kibana.alert.rule.created_by',
    'kibana.alert.rule.description',
    'kibana.alert.rule.enabled',
    'kibana.alert.rule.false_positives',
    'kibana.alert.rule.from',
    'kibana.alert.rule.uuid',
    'kibana.alert.rule.immutable',
    'kibana.alert.rule.interval',
    'kibana.alert.rule.max_signals',
    'kibana.alert.rule.name',
    'kibana.alert.rule.note',
    'kibana.alert.rule.references',
    'kibana.alert.risk_score',
    'kibana.alert.rule.rule_id',
    'kibana.alert.severity',
    'kibana.alert.rule.size',
    'kibana.alert.rule.tags',
    'kibana.alert.rule.threat',
    'kibana.alert.rule.threat.tactic.id',
    'kibana.alert.rule.threat.tactic.name',
    'kibana.alert.rule.threat.tactic.reference',
    'kibana.alert.rule.threat.technique.id',
    'kibana.alert.rule.threat.technique.name',
    'kibana.alert.rule.threat.technique.reference',
    'kibana.alert.rule.timeline_id',
    'kibana.alert.rule.timeline_title',
    'kibana.alert.rule.to',
    'kibana.alert.rule.type',
    'kibana.alert.rule.updated_by',
    'kibana.alert.rule.version',
    'kibana.alert.workflow_status',
  ].includes(fieldName);

  if (hideTopN) {
    return false;
  }

  return isAllowlistedNonBrowserField || (isAggregatable && isAllowedType);
};

const getAllBrowserFields = (browserFields: BrowserFields): Array<Partial<BrowserField>> =>
  Object.values(browserFields).reduce<Array<Partial<BrowserField>>>(
    (acc, namespace) => [
      ...acc,
      ...Object.values(namespace.fields != null ? namespace.fields : {}),
    ],
    []
  );

const getAllFieldsByName = (
  browserFields: BrowserFields
): { [fieldName: string]: Partial<BrowserField> } =>
  keyBy('name', getAllBrowserFields(browserFields));

const linkFields: Record<string, string> = {
  'kibana.alert.rule.name': 'kibana.alert.rule.uuid',
  'event.module': 'rule.reference',
};

interface AddFieldToTimelineColumnsParams {
  defaultsHeader: ColumnHeaderOptions[];
  browserFields: BrowserFields;
  dispatch: Dispatch;
  result: DropResult;
  scopeId: string;
}

export const addFieldToColumns = ({
  browserFields,
  dispatch,
  result,
  scopeId,
  defaultsHeader,
}: AddFieldToTimelineColumnsParams): void => {
  const fieldId = getFieldIdFromDraggable(result);
  const allColumns = getAllFieldsByName(browserFields);
  const column = allColumns[fieldId];
  const initColumnHeader =
    scopeId === TableId.alertsOnAlertsPage || scopeId === TableId.alertsOnRuleDetailsPage
      ? defaultsHeader.find((c) => c.id === fieldId) ?? {}
      : {};

  const scopedActions = getScopedActions(scopeId);
  if (column != null && scopedActions) {
    dispatch(
      scopedActions.upsertColumn({
        column: {
          columnHeaderType: 'not-filtered',
          id: fieldId,
          linkField: linkFields[fieldId] ?? undefined,
          type: column.type,
          aggregatable: column.aggregatable,
          initialWidth: DEFAULT_COLUMN_MIN_WIDTH,
          ...initColumnHeader,
        },
        id: scopeId,
        index: result.destination != null ? result.destination.index : 0,
      })
    );
  } else if (scopedActions) {
    // create a column definition, because it doesn't exist in the browserFields:
    dispatch(
      scopedActions.upsertColumn({
        column: {
          columnHeaderType: 'not-filtered',
          id: fieldId,
          initialWidth: DEFAULT_COLUMN_MIN_WIDTH,
        },
        id: scopeId,
        index: result.destination != null ? result.destination.index : 0,
      })
    );
  }
};

export const getIdFromColumnDroppableId = (droppableId: string) =>
  droppableId.slice(droppableId.lastIndexOf('.') + 1);
