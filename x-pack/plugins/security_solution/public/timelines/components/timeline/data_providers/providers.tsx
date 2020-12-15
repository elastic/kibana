/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiFlexItem, EuiFormHelpText, EuiSpacer } from '@elastic/eui';
import { rgba } from 'polished';
import React, { useCallback, useMemo } from 'react';
import { Draggable, DraggingStyle, Droppable, NotDraggingStyle } from 'react-beautiful-dnd';
import styled from 'styled-components';
import { useDispatch } from 'react-redux';
import deepEqual from 'fast-deep-equal';

import { timelineActions } from '../../../store/timeline';

import { AndOrBadge } from '../../../../common/components/and_or_badge';
import { AddDataProviderPopover } from './add_data_provider_popover';
import { BrowserFields } from '../../../../common/containers/source';
import {
  getTimelineProviderDroppableId,
  IS_DRAGGING_CLASS_NAME,
  getTimelineProviderDraggableId,
} from '../../../../common/components/drag_and_drop/helpers';

import { DataProvider, DataProviderType, DataProvidersAnd, IS_OPERATOR } from './data_provider';
import { EMPTY_GROUP, flattenIntoAndGroups } from './helpers';
import { ProviderItemBadge } from './provider_item_badge';

export const EMPTY_PROVIDERS_GROUP_CLASS_NAME = 'empty-providers-group';

interface Props {
  browserFields: BrowserFields;
  timelineId: string;
  dataProviders: DataProvider[];
}

/**
 * This fixed height prevents the timeline's droppable area from growing,
 * (growth causes layout thrashing) when the AND drop target in a row
 * of data providers is revealed.
 */
const ROW_OF_DATA_PROVIDERS_HEIGHT = 36; // px

const listStyle: React.CSSProperties = {
  alignItems: 'center',
  display: 'flex',
  height: `${ROW_OF_DATA_PROVIDERS_HEIGHT}px`,
  minWidth: '125px',
};

const getItemStyle = (
  draggableStyle: DraggingStyle | NotDraggingStyle | undefined
): React.CSSProperties => ({
  ...draggableStyle,
  userSelect: 'none',
});

const DroppableContainer = styled.div`
  min-height: ${ROW_OF_DATA_PROVIDERS_HEIGHT}px;
  height: auto !important;

  .${IS_DRAGGING_CLASS_NAME} &:hover {
    background-color: ${({ theme }) => rgba(theme.eui.euiColorSuccess, 0.2)} !important;
  }
`;

const Parens = styled.span`
  color: ${({ theme }) => theme.eui.euiColorMediumShade};
  font-size: 32px;
  padding: 2px;
  user-select: none;
`;

const AndOrBadgeContainer = styled.div<{ hideBadge: boolean }>`
  span {
    visibility: ${({ hideBadge }) => (hideBadge ? 'hidden' : 'inherit')};
  }
`;

const LastAndOrBadgeInGroup = styled.div`
  display: none;

  .${IS_DRAGGING_CLASS_NAME} & {
    display: initial;
  }
`;

const OrFlexItem = styled(EuiFlexItem)`
  padding-left: 9px;
`;

const TimelineEuiFormHelpText = styled(EuiFormHelpText)`
  padding-top: 0px;
  position: absolute;
  bottom: 0px;
  left: 4px;
`;

TimelineEuiFormHelpText.displayName = 'TimelineEuiFormHelpText';

const ParensContainer = styled(EuiFlexItem)`
  align-self: center;
`;

const getDataProviderValue = (dataProvider: DataProvidersAnd) =>
  dataProvider.queryMatch.displayValue ?? dataProvider.queryMatch.value;

/**
 * Renders an interactive card representation of the data providers. It also
 * affords uniform UI controls for the following actions:
 * 1) removing a data provider
 * 2) temporarily disabling a data provider
 * 3) applying boolean negation to the data provider
 */
export const Providers = React.memo<Props>(({ browserFields, timelineId, dataProviders }) => {
  // Transform the dataProviders into flattened groups, and append an empty group
  const dataProviderGroups: DataProvidersAnd[][] = useMemo(
    () => [...flattenIntoAndGroups(dataProviders), ...EMPTY_GROUP],
    [dataProviders]
  );

  const content = useMemo(
    () =>
      dataProviderGroups.map((group, groupIndex) => (
        <DataProvidersGroup
          key={`droppable-${groupIndex}`}
          group={group}
          groupIndex={groupIndex}
          isLastGroup={groupIndex === dataProviderGroups.length - 1}
          browserFields={browserFields}
          timelineId={timelineId}
          dataProviders={dataProviders}
        />
      )),
    [browserFields, dataProviderGroups, dataProviders, timelineId]
  );

  return <div>{content}</div>;
});

Providers.displayName = 'Providers';

interface DataProvidersGroupItem extends Omit<Props, 'dataProviders'> {
  index: number;
  dataProvider: DataProvidersAnd;
  group: DataProvidersAnd[];
  groupIndex: number;
}

export const DataProvidersGroupItem = React.memo<DataProvidersGroupItem>(
  ({ browserFields, group, groupIndex, dataProvider, index, timelineId }) => {
    const dispatch = useDispatch();
    const draggableId = useMemo(
      () =>
        getTimelineProviderDraggableId({
          dataProviderId: dataProvider.id,
          groupIndex,
          timelineId,
        }),
      [dataProvider.id, groupIndex, timelineId]
    );

    const handleDeleteProvider = useCallback(() => {
      const payload = {
        id: timelineId,
        providerId: index > 0 ? group[0].id : dataProvider.id,
        andProviderId: index > 0 ? dataProvider.id : undefined,
      };

      dispatch(timelineActions.removeProvider(payload));
    }, [dataProvider.id, dispatch, group, index, timelineId]);

    const handleToggleEnabledProvider = useCallback(() => {
      const payload = {
        id: timelineId,
        providerId: index > 0 ? group[0].id : dataProvider.id,
        enabled: !dataProvider.enabled,
        andProviderId: index > 0 ? dataProvider.id : undefined,
      };

      dispatch(timelineActions.updateDataProviderEnabled(payload));
    }, [dataProvider.enabled, dataProvider.id, dispatch, group, index, timelineId]);

    const handleToggleExcludedProvider = useCallback(() => {
      const payload = {
        id: timelineId,
        providerId: index > 0 ? group[0].id : dataProvider.id,
        excluded: !dataProvider.excluded,
        andProviderId: index > 0 ? dataProvider.id : undefined,
      };

      dispatch(timelineActions.updateDataProviderExcluded(payload));
    }, [dataProvider.excluded, dataProvider.id, dispatch, group, index, timelineId]);

    const handleToggleTypeProvider = useCallback(() => {
      const payload = {
        id: timelineId,
        providerId: index > 0 ? group[0].id : dataProvider.id,
        type:
          dataProvider.type === DataProviderType.template
            ? DataProviderType.default
            : DataProviderType.template,
        andProviderId: index > 0 ? dataProvider.id : undefined,
      };

      dispatch(timelineActions.updateDataProviderType(payload));
    }, [dataProvider.id, dataProvider.type, dispatch, group, index, timelineId]);

    const handleDataProviderEdited = useCallback(
      ({ andProviderId, excluded, field, operator, providerId, value }) =>
        dispatch(
          timelineActions.dataProviderEdited({
            andProviderId,
            excluded,
            field,
            id: timelineId,
            operator,
            providerId,
            value,
          })
        ),
      [dispatch, timelineId]
    );

    const DraggableContent = useCallback(
      (provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          style={getItemStyle(provided.draggableProps.style)}
          data-test-subj="providerContainer"
        >
          <EuiFlexGroup alignItems="center" gutterSize="none">
            <EuiFlexItem grow={false}>
              <ProviderItemBadge
                andProviderId={index > 0 ? dataProvider.id : undefined}
                browserFields={browserFields}
                deleteProvider={handleDeleteProvider}
                field={
                  index > 0
                    ? dataProvider.queryMatch.displayField ?? dataProvider.queryMatch.field
                    : group[0].queryMatch.displayField ?? group[0].queryMatch.field
                }
                kqlQuery={index > 0 ? dataProvider.kqlQuery : group[0].kqlQuery}
                isEnabled={index > 0 ? dataProvider.enabled : group[0].enabled}
                isExcluded={index > 0 ? dataProvider.excluded : group[0].excluded}
                onDataProviderEdited={handleDataProviderEdited}
                operator={
                  index > 0
                    ? dataProvider.queryMatch.operator ?? IS_OPERATOR
                    : group[0].queryMatch.operator ?? IS_OPERATOR
                }
                register={dataProvider}
                providerId={index > 0 ? group[0].id : dataProvider.id}
                timelineId={timelineId}
                toggleEnabledProvider={handleToggleEnabledProvider}
                toggleExcludedProvider={handleToggleExcludedProvider}
                toggleTypeProvider={handleToggleTypeProvider}
                val={getDataProviderValue(dataProvider)}
                type={dataProvider.type}
              />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              {!snapshot.isDragging &&
                (index < group.length - 1 ? (
                  <AndOrBadge type="and" />
                ) : (
                  <LastAndOrBadgeInGroup>
                    <AndOrBadge type="and" />
                  </LastAndOrBadgeInGroup>
                ))}
            </EuiFlexItem>
          </EuiFlexGroup>
        </div>
      ),
      [
        browserFields,
        dataProvider,
        group,
        handleDataProviderEdited,
        handleDeleteProvider,
        handleToggleEnabledProvider,
        handleToggleExcludedProvider,
        handleToggleTypeProvider,
        index,
        timelineId,
      ]
    );

    return (
      <Draggable
        disableInteractiveElementBlocking={true}
        draggableId={draggableId}
        index={index}
        key={dataProvider.id}
      >
        {DraggableContent}
      </Draggable>
    );
  },
  (prevProps, nextProps) =>
    prevProps.groupIndex === nextProps.groupIndex &&
    prevProps.index === nextProps.index &&
    prevProps.timelineId === nextProps.timelineId &&
    deepEqual(prevProps.browserFields, nextProps.browserFields) &&
    deepEqual(prevProps.group, nextProps.group) &&
    deepEqual(prevProps.dataProvider, nextProps.dataProvider)
);

DataProvidersGroupItem.displayName = 'DataProvidersGroupItem';

interface DataProvidersGroup extends Props {
  group: DataProvidersAnd[];
  groupIndex: number;
  isLastGroup: boolean;
}

const DataProvidersGroup = React.memo<DataProvidersGroup>(
  ({ browserFields, timelineId, group, groupIndex, isLastGroup }) => {
    const droppableId = useMemo(() => getTimelineProviderDroppableId({ groupIndex, timelineId }), [
      groupIndex,
      timelineId,
    ]);

    const GroupDataProviders = useMemo(
      () =>
        group.map((dataProvider, index) => (
          <DataProvidersGroupItem
            key={dataProvider.id}
            browserFields={browserFields}
            dataProvider={dataProvider}
            index={index}
            timelineId={timelineId}
            group={group}
            groupIndex={groupIndex}
          />
        )),
      [browserFields, group, groupIndex, timelineId]
    );

    const DroppableContent = useCallback(
      (droppableProvided) => (
        <DroppableContainer
          className={isLastGroup ? EMPTY_PROVIDERS_GROUP_CLASS_NAME : ''}
          ref={droppableProvided.innerRef}
          style={listStyle}
          {...droppableProvided.droppableProps}
        >
          {GroupDataProviders}
          {droppableProvided.placeholder}
        </DroppableContainer>
      ),
      [GroupDataProviders, isLastGroup]
    );

    return (
      <>
        {groupIndex !== 0 && <EuiSpacer size="xs" />}

        <EuiFlexGroup alignItems="center" gutterSize="none">
          <OrFlexItem grow={false}>
            <AndOrBadgeContainer hideBadge={groupIndex === 0}>
              <AndOrBadge type="or" />
            </AndOrBadgeContainer>
          </OrFlexItem>
          <ParensContainer grow={false}>
            <Parens>{'('}</Parens>
          </ParensContainer>
          <EuiFlexItem grow={false}>
            <Droppable droppableId={droppableId} direction="horizontal">
              {DroppableContent}
            </Droppable>
          </EuiFlexItem>
          <ParensContainer grow={false}>
            <Parens>{')'}</Parens>
          </ParensContainer>
          {isLastGroup && (
            <AddDataProviderPopover browserFields={browserFields} timelineId={timelineId} />
          )}
        </EuiFlexGroup>
      </>
    );
  }
);

DataProvidersGroup.displayName = 'DataProvidersGroup';
