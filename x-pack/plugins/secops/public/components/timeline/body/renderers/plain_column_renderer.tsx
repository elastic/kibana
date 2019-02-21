/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getOr } from 'lodash/fp';
import { has } from 'lodash/fp';
import React from 'react';

import { ColumnRenderer } from '.';
import { Ecs } from '../../../../graphql/types';
import { EcsField, getMappedEcsValue, mappedEcsSchemaFieldNames } from '../../../../lib/ecs';
import { escapeQueryValue } from '../../../../lib/keury';
import { DragEffects, DraggableWrapper } from '../../../drag_and_drop/draggable_wrapper';
import { escapeDataProviderId } from '../../../drag_and_drop/helpers';
import { Provider } from '../../data_providers/provider';
import { FormattedField } from './formatted_field';

export const dataExistsAtColumn = (columnName: string, data: Ecs): boolean => has(columnName, data);

export const plainColumnRenderer: ColumnRenderer = {
  isInstance: (columnName: string, ecs: Ecs) => dataExistsAtColumn(columnName, ecs),

  renderColumn: (columnName: string, data: Ecs, field?: EcsField) => {
    const itemDataProvider = {
      enabled: true,
      id: escapeDataProviderId(`id-timeline-column-${columnName}-for-event-${data._id!}`),
      name: `${columnName}: ${getMappedEcsValue({
        data,
        fieldName: columnName,
      })}`,
      queryMatch: {
        field: getOr(columnName, columnName, mappedEcsSchemaFieldNames),
        value: escapeQueryValue(
          getMappedEcsValue({
            data,
            fieldName: columnName,
          })
        ),
      },
      excluded: false,
      kqlQuery: '',
      and: [],
    };

    const fieldType = field != null ? field.type : '';

    return (
      <DraggableWrapper
        key={`timeline-draggable-column-${columnName}-for-event-${data._id!}`}
        dataProvider={itemDataProvider}
        render={(dataProvider, _, snapshot) =>
          snapshot.isDragging ? (
            <DragEffects>
              <Provider dataProvider={dataProvider} />
            </DragEffects>
          ) : (
            <FormattedField data={data} fieldName={columnName} fieldType={fieldType} />
          )
        }
      />
    );
  },
};
