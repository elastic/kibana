/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as React from 'react';
import uuid from 'uuid';

import { EventsQuery } from '../../containers/events';
import { EcsField, getMappedEcsValue } from '../../lib/ecs';
import { DraggableWrapper } from '../drag_and_drop/draggable_wrapper';
import { ECS } from '../timeline/ecs';

/**
 * Defines the behavior of the search input that appears above the table of data
 */
export const search = {
  box: {
    incremental: true,
    placeholder: 'Filter by Field, Value, or Description...',
    schema: {
      field: {
        type: 'string',
      },
      value: {
        type: 'string',
      },
      description: {
        type: 'string',
      },
    },
  },
};

/**
 * An item rendered in the table
 */
interface Item {
  field: string;
  description: string;
  type: string;
  value: JSX.Element;
  valueAsString: string;
}

/** Returns example text, or an empty string if the field does not have an example */
export const getExampleText = (field: EcsField): string =>
  field.example.length > 0 ? `Example: ${field.example}` : '';

export const getIconFromType = (type: string) => {
  switch (type) {
    case 'keyword':
      return 'string';
    case 'long':
      return 'number';
    case 'date':
      return 'clock';
    case 'ip':
      return 'globe';
    case 'object':
      return 'questionInCircle';
    case 'float':
      return 'number';
    default:
      return 'questionInCircle';
  }
};

interface GetItemsParams {
  /** the runtime representation of an event */
  data: ECS;
  /** all the fields that are populated in `data` */
  populatedFields: EcsField[];
}

/**
 * Given `data`, the runtime representation of an event,
 * and `populatedFields`, an `EcsField[]` containing all the fields that are
 * populated in `data`, it returns an `Item[]`, so the data can be shown in
 * the table
 */
export const getItems = ({ data, populatedFields }: GetItemsParams): Item[] => {
  return populatedFields.map((field, i) => ({
    description: `${field.description} ${getExampleText(field)}`,
    field: field.name,
    type: field.type,
    valueAsString: `${getMappedEcsValue({
      data,
      fieldName: field.name,
    })}`,
    value: (
      <DraggableWrapper
        key={`event-field-browser-value-for-${field.name}-${uuid.v4()}`}
        dataProvider={{
          enabled: true,
          id: `id-event-field-browser-value-for-${field.name.replace('.', '_')}-${uuid.v4()}`, // escape '.'s in the field names
          name: `${field.name}: ${getMappedEcsValue({
            data,
            fieldName: field.name,
          })}`,
          componentResultParam: 'events',
          componentQuery: EventsQuery,
          componentQueryProps: {
            sourceId: 'default',
            startDate: 1521830963132, // TODO / IMPORTANT / DISCUSS: we need to know the date from the data provider that brought in this data
            endDate: 1521862432253, // TODO / IMPORTANT / DISCUSS: we need to know the date from the data provider that brought in this data
            filterQuery: '',
          },
          negated: false,
          and: [],
        }}
        render={() => `${getMappedEcsValue({ data, fieldName: field.name })}`}
      />
    ),
  }));
};
