/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { isEmpty } from 'lodash/fp';
import * as React from 'react';

import { DetailItem } from '../../graphql/types';
import { escapeQueryValue } from '../../lib/keury';
import { DragEffects, DraggableWrapper } from '../drag_and_drop/draggable_wrapper';
import { escapeDataProviderId } from '../drag_and_drop/helpers';
import { FormattedFieldValue } from '../timeline/body/renderers/formatted_field';
import { parseValue } from '../timeline/body/renderers/plain_column_renderer';
import { Provider } from '../timeline/data_providers/provider';

import * as i18n from './translations';

/**
 * Defines the behavior of the search input that appears above the table of data
 */
export const search = {
  box: {
    incremental: true,
    placeholder: i18n.PLACEHOLDER,
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
export const getExampleText = (field: DetailItem): string =>
  !isEmpty(field.example) ? `Example: ${field.example}` : '';

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

/**
 * Return a draggable value for the details item view in the timeline
 */
export const getItems = (data: DetailItem[], id: string): Item[] =>
  data.map(item => {
    const itemDataProvider = {
      enabled: true,
      id: escapeDataProviderId(`id-event-field-browser-value-for-${item.field}-${id}`),
      name: item.field,
      queryMatch: {
        field: item.field,
        value: escapeQueryValue(item.value),
      },
      excluded: false,
      kqlQuery: '',
      and: [],
    };

    return {
      description: `${item.description || ''} ${getExampleText(item)}`,
      field: item.field,
      type: item.type,
      valueAsString: item.value.toString(),
      value: (
        <DraggableWrapper
          key={`event-field-browser-value-for-${item.field}-${id}`}
          dataProvider={itemDataProvider}
          render={(dataProvider, _, snapshot) =>
            snapshot.isDragging ? (
              <DragEffects>
                <Provider dataProvider={dataProvider} />
              </DragEffects>
            ) : (
              <FormattedFieldValue
                contextId="event-details"
                eventId={id}
                fieldName={item.field}
                fieldType={item.type}
                value={parseValue(item.value)}
              />
            )
          }
        />
      ),
    };
  });
