/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiBadge, IconType } from '@elastic/eui';
import * as React from 'react';
import { pure } from 'recompose';
import styled from 'styled-components';

import { escapeQueryValue } from '../../lib/keury';
import { DragEffects, DraggableWrapper } from '../drag_and_drop/draggable_wrapper';
import { escapeDataProviderId } from '../drag_and_drop/helpers';
import { Provider } from '../timeline/data_providers/provider';

export interface DefaultDraggableType {
  id: string;
  field: string;
  value: string | null | undefined;
  name?: string | null;
  queryValue?: string | null;
  children?: React.ReactNode;
}

export const DefaultDraggable = pure<DefaultDraggableType>(
  ({ id, field, value, name, children, queryValue }) =>
    value != null ? (
      <DraggableWrapper
        dataProvider={{
          and: [],
          enabled: true,
          id: escapeDataProviderId(`${id}-${field}`),
          name: name ? name : value,
          excluded: false,
          kqlQuery: '',
          queryMatch: {
            field,
            value: escapeQueryValue(queryValue ? queryValue : value),
          },
        }}
        render={(dataProvider, _, snapshot) =>
          snapshot.isDragging ? (
            <DragEffects>
              <Provider dataProvider={dataProvider} />
            </DragEffects>
          ) : (
            <>{children ? children : value}</>
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

export const DraggableBadge = pure<BadgeDraggableType>(
  ({ contextId, eventId, field, value, name, color = 'hollow', children, queryValue, iconType }) =>
    value != null ? (
      <DefaultDraggable
        id={`${contextId}-${eventId}-${field}-${value}`}
        field={field}
        name={name}
        value={value}
        queryValue={queryValue}
      >
        <Badge iconType={iconType} color={color}>
          {children ? children : value}
        </Badge>
      </DefaultDraggable>
    ) : null
);
