/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBadge, EuiToolTip } from '@elastic/eui';
import type { IconType, ToolTipPositions } from '@elastic/eui';
import React, { useCallback, useMemo } from 'react';
import styled from 'styled-components';

import { DragEffects, DraggableWrapper } from '../drag_and_drop/draggable_wrapper';
import { escapeDataProviderId } from '../drag_and_drop/helpers';
import { getEmptyStringTag } from '../empty_value';
import {
  DataProvider,
  IS_OPERATOR,
} from '../../../timelines/components/timeline/data_providers/data_provider';
import { Provider } from '../../../timelines/components/timeline/data_providers/provider';

export interface DefaultDraggableType {
  hideTopN?: boolean;
  id: string;
  isDraggable?: boolean;
  field: string;
  value?: string | number | null;
  name?: string | null;
  queryValue?: string | null;
  children?: React.ReactNode;
  timelineId?: string;
  tooltipContent?: React.ReactNode;
  tooltipPosition?: ToolTipPositions;
}

/**
 * Only returns true if the specified tooltipContent is exactly `null`.
 * Example input / output:
 * `bob -> false`
 * `undefined -> false`
 * `<span>thing</span> -> false`
 * `null -> true`
 */
export const tooltipContentIsExplicitlyNull = (tooltipContent?: React.ReactNode): boolean =>
  tooltipContent === null; // an explicit / exact null check

/**
 * Derives the tooltip content from the field name if no tooltip was specified
 */
export const getDefaultWhenTooltipIsUnspecified = ({
  field,
  tooltipContent,
}: {
  field: string;
  tooltipContent?: React.ReactNode;
}): React.ReactNode => (tooltipContent != null ? tooltipContent : field);

/**
 * Renders the content of the draggable, wrapped in a tooltip
 */
export const Content = React.memo<{
  children?: React.ReactNode;
  field: string;
  tooltipContent?: React.ReactNode;
  tooltipPosition?: ToolTipPositions;
  value?: string | number | null;
}>(({ children, field, tooltipContent, tooltipPosition, value }) =>
  !tooltipContentIsExplicitlyNull(tooltipContent) ? (
    <EuiToolTip
      data-test-subj={`${field}-tooltip`}
      position={tooltipPosition}
      content={getDefaultWhenTooltipIsUnspecified({ tooltipContent, field })}
    >
      <>{children ? children : value}</>
    </EuiToolTip>
  ) : (
    <>{children ? children : value}</>
  )
);

Content.displayName = 'Content';

/**
 * Draggable text (or an arbitrary visualization specified by `children`)
 * that's only displayed when the specified value is non-`null`.
 *
 * @param id - a unique draggable id, which typically follows the format `${contextId}-${eventId}-${field}-${value}`
 * @param isDraggable - optional prop to disable drag & drop and  it will defaulted to true
 * @param field - the name of the field, e.g. `network.transport`
 * @param value - value of the field e.g. `tcp`
 * @param name - defaulting to `field`, this optional human readable name is used by the `DataProvider` that represents the data
 * @param children - defaults to displaying `value`, this allows an arbitrary visualization to be displayed in lieu of the default behavior
 * @param tooltipContent - defaults to displaying `field`, pass `null` to
 * prevent a tooltip from being displayed, or pass arbitrary content
 * @param tooltipPosition - defaults to eui's default tooltip position
 * @param queryValue - defaults to `value`, this query overrides the `queryMatch.value` used by the `DataProvider` that represents the data
 * @param hideTopN - defaults to `false`, when true, the option to aggregate this field will be hidden
 */
export const DefaultDraggable = React.memo<DefaultDraggableType>(
  ({
    hideTopN = false,
    id,
    isDraggable = true,
    field,
    value,
    name,
    children,
    timelineId,
    tooltipContent,
    tooltipPosition,
    queryValue,
  }) => {
    const dataProviderProp: DataProvider = useMemo(
      () => ({
        and: [],
        enabled: true,
        id: escapeDataProviderId(id),
        name: name ? name : value?.toString() ?? '',
        excluded: false,
        kqlQuery: '',
        queryMatch: {
          field,
          value: queryValue ? queryValue : value ?? '',
          operator: IS_OPERATOR,
        },
      }),
      [field, id, name, queryValue, value]
    );

    const renderCallback = useCallback(
      (dataProvider, _, snapshot) =>
        snapshot.isDragging ? (
          <DragEffects>
            <Provider dataProvider={dataProvider} />
          </DragEffects>
        ) : (
          <Content
            field={field}
            tooltipContent={tooltipContent}
            tooltipPosition={tooltipPosition}
            value={value}
          >
            {children}
          </Content>
        ),
      [children, field, tooltipContent, tooltipPosition, value]
    );

    if (value == null) return null;

    return (
      <DraggableWrapper
        dataProvider={dataProviderProp}
        hideTopN={hideTopN}
        isDraggable={isDraggable}
        render={renderCallback}
        timelineId={timelineId}
      />
    );
  }
);

DefaultDraggable.displayName = 'DefaultDraggable';

export const Badge = styled(EuiBadge)`
  vertical-align: top;
`;

Badge.displayName = 'Badge';

export type BadgeDraggableType = Omit<DefaultDraggableType, 'id'> & {
  contextId: string;
  eventId: string;
  iconType?: IconType;
  color?: string;
};

/**
 * A draggable badge that's only displayed when the specified value is non-`null`.
 *
 * @param contextId - used as part of the formula to derive a unique draggable id, this describes the context e.g. `event-fields-browser` in which the badge is displayed
 * @param eventId - uniquely identifies an event, as specified in the `_id` field of the document
 * @param field - the name of the field, e.g. `network.transport`
 * @param value - value of the field e.g. `tcp`
 * @param iconType -the (optional) type of icon e.g. `snowflake` to display on the badge
 * @param isDraggable
 * @param name - defaulting to `field`, this optional human readable name is used by the `DataProvider` that represents the data
 * @param color - defaults to `hollow`, optionally overwrite the color of the badge icon
 * @param children - defaults to displaying `value`, this allows an arbitrary visualization to be displayed in lieu of the default behavior
 * @param tooltipContent - defaults to displaying `field`, pass `null` to
 * prevent a tooltip from being displayed, or pass arbitrary content
 * @param queryValue - defaults to `value`, this query overrides the `queryMatch.value` used by the `DataProvider` that represents the data
 */
const DraggableBadgeComponent: React.FC<BadgeDraggableType> = ({
  contextId,
  eventId,
  field,
  value,
  iconType,
  isDraggable,
  name,
  color = 'hollow',
  children,
  tooltipContent,
  queryValue,
}) =>
  value != null ? (
    <DefaultDraggable
      id={`draggable-badge-default-draggable-${contextId}-${eventId}-${field}-${value}`}
      isDraggable={isDraggable}
      field={field}
      name={name}
      value={value}
      tooltipContent={tooltipContent}
      queryValue={queryValue}
    >
      <Badge iconType={iconType} color={color} title="">
        {children ? children : value !== '' ? value : getEmptyStringTag()}
      </Badge>
    </DefaultDraggable>
  ) : null;

DraggableBadgeComponent.displayName = 'DraggableBadgeComponent';

export const DraggableBadge = React.memo(DraggableBadgeComponent);
DraggableBadge.displayName = 'DraggableBadge';
