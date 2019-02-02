/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiToolTip } from '@elastic/eui';
import { FormattedRelative } from '@kbn/i18n/react';
import { getOr } from 'lodash/fp';
import moment from 'moment';
import * as React from 'react';
import { pure } from 'recompose';
import styled from 'styled-components';

import { Ecs } from '../../graphql/types';
import { EcsField, getMappedEcsValue, mappedEcsSchemaFieldNames } from '../../lib/ecs';
import { escapeQueryValue } from '../../lib/keury';
import { DragEffects, DraggableWrapper } from '../drag_and_drop/draggable_wrapper';
import { escapeDataProviderId } from '../drag_and_drop/helpers';
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
  data: Ecs;
  /** all the fields that are populated in `data` */
  populatedFields: EcsField[];
}

const DatesContainer = styled.div`
  display: flex;
  flex-direction: column;
`;

export const DateFieldWithTooltip = pure<{ dateString: string }>(({ dateString }) => (
  <EuiToolTip
    data-test-subj="timeline-event-timestamp-tool-tip"
    content={
      <DatesContainer>
        <FormattedRelative data-test-subj="last-updated-at-date" value={new Date(dateString)} />
        <div>
          {moment(dateString)
            .local()
            .format('llll')}
        </div>
        <div>{moment(dateString).format()}</div>
      </DatesContainer>
    }
  >
    <>{dateString}</>
  </EuiToolTip>
));

/**
 * Given `data`, the runtime representation of an event,
 * and `populatedFields`, an `EcsField[]` containing all the fields that are
 * populated in `data`, it returns an `Item[]`, so the data can be shown in
 * the table
 */
export const getItems = ({ data, populatedFields }: GetItemsParams): Item[] =>
  populatedFields.map(field => {
    const itemDataProvider = {
      enabled: true,
      id: escapeDataProviderId(`id-event-field-browser-value-for-${field.name}-${data._id!}`),
      name: `${field.name}: ${getMappedEcsValue({
        data,
        fieldName: field.name,
      })}`,
      queryMatch: {
        field: getOr(field.name, field.name, mappedEcsSchemaFieldNames),
        value: escapeQueryValue(
          getMappedEcsValue({
            data,
            fieldName: field.name,
          })
        ),
      },
      excluded: false,
      kqlQuery: '',
      and: [],
    };

    return {
      description: `${field.description} ${getExampleText(field)}`,
      field: field.name,
      type: field.type,
      valueAsString: `${getMappedEcsValue({
        data,
        fieldName: field.name,
      })}`,
      value: (
        <DraggableWrapper
          key={`event-field-browser-value-for-${field.name}-${data._id!}`}
          dataProvider={itemDataProvider}
          render={(dataProvider, _, snapshot) =>
            snapshot.isDragging ? (
              <DragEffects>
                <Provider dataProvider={dataProvider} />
              </DragEffects>
            ) : (
              <>
                {field.name !== '@timestamp' ? (
                  `${getMappedEcsValue({ data, fieldName: field.name })}`
                ) : (
                  <DateFieldWithTooltip
                    dateString={getMappedEcsValue({ data, fieldName: field.name })!}
                  />
                )}
              </>
            )
          }
        />
      ),
    };
  });
