/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiFlexItem, EuiFormHelpText, EuiSpacer } from '@elastic/eui';
import { rgba } from 'polished';
import React, { Fragment, useMemo } from 'react';
import { Draggable, DraggingStyle, Droppable, NotDraggingStyle } from 'react-beautiful-dnd';
import styled, { css } from 'styled-components';

import { AndOrBadge } from '../../../../common/components/and_or_badge';
import { AddDataProviderPopover } from './add_data_provider_popover';
import { BrowserFields } from '../../../../common/containers/source';
import {
  getTimelineProviderDroppableId,
  IS_DRAGGING_CLASS_NAME,
  getTimelineProviderDraggableId,
} from '../../../../common/components/drag_and_drop/helpers';
import {
  OnDataProviderEdited,
  OnDataProviderRemoved,
  OnToggleDataProviderEnabled,
  OnToggleDataProviderExcluded,
  OnToggleDataProviderType,
} from '../events';

import { DataProvider, DataProviderType, DataProvidersAnd, IS_OPERATOR } from './data_provider';
import { EMPTY_GROUP, flattenIntoAndGroups } from './helpers';
import { ProviderItemBadge } from './provider_item_badge';

export const EMPTY_PROVIDERS_GROUP_CLASS_NAME = 'empty-providers-group';

interface Props {
  browserFields: BrowserFields;
  timelineId: string;
  dataProviders: DataProvider[];
  onDataProviderEdited: OnDataProviderEdited;
  onDataProviderRemoved: OnDataProviderRemoved;
  onToggleDataProviderEnabled: OnToggleDataProviderEnabled;
  onToggleDataProviderExcluded: OnToggleDataProviderExcluded;
  onToggleDataProviderType: OnToggleDataProviderType;
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
  ${({ theme }) => css`
    color: ${theme.eui.euiColorMediumShade};
    font-size: 32px;
    padding: 2px;
    user-select: none;
  `}
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
export const Providers = React.memo<Props>(
  ({
    browserFields,
    timelineId,
    dataProviders,
    onDataProviderEdited,
    onDataProviderRemoved,
    onToggleDataProviderEnabled,
    onToggleDataProviderExcluded,
    onToggleDataProviderType,
  }) => {
    // Transform the dataProviders into flattened groups, and append an empty group
    const dataProviderGroups: DataProvidersAnd[][] = useMemo(
      () => [...flattenIntoAndGroups(dataProviders), ...EMPTY_GROUP],
      [dataProviders]
    );

    return (
      <div>
        {dataProviderGroups.map((group, groupIndex) => (
          <Fragment key={`droppable-${groupIndex}`}>
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
                <Droppable
                  droppableId={getTimelineProviderDroppableId({ groupIndex, timelineId })}
                  direction="horizontal"
                >
                  {(droppableProvided) => (
                    <DroppableContainer
                      className={
                        groupIndex === dataProviderGroups.length - 1
                          ? EMPTY_PROVIDERS_GROUP_CLASS_NAME
                          : ''
                      }
                      ref={droppableProvided.innerRef}
                      style={listStyle}
                      {...droppableProvided.droppableProps}
                    >
                      {group.map((dataProvider, index) => (
                        <Draggable
                          disableInteractiveElementBlocking={true}
                          draggableId={getTimelineProviderDraggableId({
                            dataProviderId: dataProvider.id,
                            groupIndex,
                            timelineId,
                          })}
                          index={index}
                          key={dataProvider.id}
                        >
                          {(provided, snapshot) => (
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
                                    deleteProvider={() =>
                                      index > 0
                                        ? onDataProviderRemoved(group[0].id, dataProvider.id)
                                        : onDataProviderRemoved(dataProvider.id)
                                    }
                                    field={
                                      index > 0
                                        ? dataProvider.queryMatch.displayField ??
                                          dataProvider.queryMatch.field
                                        : group[0].queryMatch.displayField ??
                                          group[0].queryMatch.field
                                    }
                                    kqlQuery={index > 0 ? dataProvider.kqlQuery : group[0].kqlQuery}
                                    isEnabled={index > 0 ? dataProvider.enabled : group[0].enabled}
                                    isExcluded={
                                      index > 0 ? dataProvider.excluded : group[0].excluded
                                    }
                                    onDataProviderEdited={onDataProviderEdited}
                                    operator={
                                      index > 0
                                        ? dataProvider.queryMatch.operator ?? IS_OPERATOR
                                        : group[0].queryMatch.operator ?? IS_OPERATOR
                                    }
                                    register={dataProvider}
                                    providerId={index > 0 ? group[0].id : dataProvider.id}
                                    timelineId={timelineId}
                                    toggleEnabledProvider={() =>
                                      index > 0
                                        ? onToggleDataProviderEnabled({
                                            providerId: group[0].id,
                                            enabled: !dataProvider.enabled,
                                            andProviderId: dataProvider.id,
                                          })
                                        : onToggleDataProviderEnabled({
                                            providerId: dataProvider.id,
                                            enabled: !dataProvider.enabled,
                                          })
                                    }
                                    toggleExcludedProvider={() =>
                                      index > 0
                                        ? onToggleDataProviderExcluded({
                                            providerId: group[0].id,
                                            excluded: !dataProvider.excluded,
                                            andProviderId: dataProvider.id,
                                          })
                                        : onToggleDataProviderExcluded({
                                            providerId: dataProvider.id,
                                            excluded: !dataProvider.excluded,
                                          })
                                    }
                                    toggleTypeProvider={() =>
                                      index > 0
                                        ? onToggleDataProviderType({
                                            providerId: group[0].id,
                                            type:
                                              dataProvider.type === DataProviderType.template
                                                ? DataProviderType.default
                                                : DataProviderType.template,
                                            andProviderId: dataProvider.id,
                                          })
                                        : onToggleDataProviderType({
                                            providerId: dataProvider.id,
                                            type:
                                              dataProvider.type === DataProviderType.template
                                                ? DataProviderType.default
                                                : DataProviderType.template,
                                          })
                                    }
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
                          )}
                        </Draggable>
                      ))}
                      {droppableProvided.placeholder}
                    </DroppableContainer>
                  )}
                </Droppable>
              </EuiFlexItem>
              <ParensContainer grow={false}>
                <Parens>{')'}</Parens>
              </ParensContainer>
              {groupIndex === dataProviderGroups.length - 1 && (
                <AddDataProviderPopover browserFields={browserFields} timelineId={timelineId} />
              )}
            </EuiFlexGroup>
          </Fragment>
        ))}
      </div>
    );
  }
);

Providers.displayName = 'Providers';
