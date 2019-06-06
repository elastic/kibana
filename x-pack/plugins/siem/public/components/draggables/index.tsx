/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiBadge, EuiToolTip, IconType } from '@elastic/eui';
import * as React from 'react';
import { pure } from 'recompose';
import styled from 'styled-components';

import { DragEffects, DraggableWrapper } from '../drag_and_drop/draggable_wrapper';
import { escapeDataProviderId } from '../drag_and_drop/helpers';
import { getEmptyStringTag } from '../empty_value';
import { IS_OPERATOR } from '../timeline/data_providers/data_provider';
import { Provider } from '../timeline/data_providers/provider';

export interface DefaultDraggableType {
  id: string;
  field: string;
  value?: string | null;
  name?: string | null;
  queryValue?: string | null;
  children?: React.ReactNode;
  tooltipContent?: React.ReactNode;
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
const Content = pure<{
  children?: React.ReactNode;
  field: string;
  tooltipContent?: React.ReactNode;
  value?: string | null;
}>(({ children, field, tooltipContent, value }) =>
  !tooltipContentIsExplicitlyNull(tooltipContent) ? (
    <EuiToolTip
      data-test-subj={`${field}-tooltip`}
      content={getDefaultWhenTooltipIsUnspecified({ tooltipContent, field })}
    >
      <>{children ? children : value}</>
    </EuiToolTip>
  ) : (
    <>{children ? children : value}</>
  )
);

/**
 * Draggable text (or an arbitrary visualization specified by `children`)
 * that's only displayed when the specified value is non-`null`.
 *
 * @param id - a unique draggable id, which typically follows the format `${contextId}-${eventId}-${field}-${value}`
 * @param field - the name of the field, e.g. `network.transport`
 * @param value - value of the field e.g. `tcp`
 * @param name - defaulting to `field`, this optional human readable name is used by the `DataProvider` that represents the data
 * @param children - defaults to displaying `value`, this allows an arbitrary visualization to be displayed in lieu of the default behavior
 * @param tooltipContent - defaults to displaying `field`, pass `null` to
 * prevent a tooltip from being displayed, or pass arbitrary content
 * @param queryValue - defaults to `value`, this query overrides the `queryMatch.value` used by the `DataProvider` that represents the data
 */
export const DefaultDraggable = pure<DefaultDraggableType>(
  ({ id, field, value, name, children, tooltipContent, queryValue }) =>
    value != null ? (
      <DraggableWrapper
        dataProvider={{
          and: [],
          enabled: true,
          id: escapeDataProviderId(id),
          name: name ? name : value,
          excluded: false,
          kqlQuery: '',
          queryMatch: {
            field,
            value: queryValue ? queryValue : value,
            operator: IS_OPERATOR,
          },
        }}
        render={(dataProvider, _, snapshot) =>
          snapshot.isDragging ? (
            <DragEffects>
              <Provider dataProvider={dataProvider} />
            </DragEffects>
          ) : (
            <Content
              children={children}
              field={field}
              tooltipContent={tooltipContent}
              value={value}
            />
          )
        }
      />
    ) : null
);

const Badge = styled(EuiBadge)`
  vertical-align: top;
`;

type Omit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>;

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
 * @param name - defaulting to `field`, this optional human readable name is used by the `DataProvider` that represents the data
 * @param color - defaults to `hollow`, optionally overwrite the color of the badge icon
 * @param children - defaults to displaying `value`, this allows an arbitrary visualization to be displayed in lieu of the default behavior
 * @param tooltipContent - defaults to displaying `field`, pass `null` to
 * prevent a tooltip from being displayed, or pass arbitrary content
 * @param queryValue - defaults to `value`, this query overrides the `queryMatch.value` used by the `DataProvider` that represents the data
 */
export const DraggableBadge = pure<BadgeDraggableType>(
  ({
    contextId,
    eventId,
    field,
    value,
    iconType,
    name,
    color = 'hollow',
    children,
    tooltipContent,
    queryValue,
  }) =>
    value != null ? (
      <DefaultDraggable
        id={`${contextId}-${eventId}-${field}-${value}`}
        field={field}
        name={name}
        value={value}
        tooltipContent={tooltipContent}
        queryValue={queryValue}
      >
        <Badge iconType={iconType} color={color}>
          {children ? children : value !== '' ? value : getEmptyStringTag()}
        </Badge>
      </DefaultDraggable>
    ) : null
);
