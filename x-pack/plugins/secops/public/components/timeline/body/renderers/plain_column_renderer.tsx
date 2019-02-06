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
import { getMappedEcsValue, mappedEcsSchemaFieldNames } from '../../../../lib/ecs';
import { escapeQueryValue } from '../../../../lib/keury';
import { DragEffects, DraggableWrapper } from '../../../drag_and_drop/draggable_wrapper';
import { escapeDataProviderId } from '../../../drag_and_drop/helpers';
import { getOrEmptyTag } from '../../../empty_value';
import { DateFieldWithTooltip } from '../../../event_details/helpers';
import { Provider } from '../../data_providers/provider';

export const dataExistsAtColumn = (columnName: string, data: Ecs): boolean => has(columnName, data);

export const plainColumnRenderer: ColumnRenderer = {
  isInstance: (columnName: string, ecs: Ecs) => dataExistsAtColumn(columnName, ecs),

  renderColumn: (columnName: string, data: Ecs) => {
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
            <>
              {columnName !== 'timestamp' ? (
                getOrEmptyTag(columnName, data)
              ) : (
                <DateFieldWithTooltip
                  dateString={getMappedEcsValue({ data, fieldName: columnName })!}
                />
              )}
            </>
          )
        }
      />
    );
  },
};
