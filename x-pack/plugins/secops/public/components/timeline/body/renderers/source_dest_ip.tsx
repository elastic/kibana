/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { getOr } from 'lodash/fp';
import * as React from 'react';
import { pure } from 'recompose';
import styled from 'styled-components';

import { Ecs } from '../../../../graphql/types';
import {
  fieldExists,
  getAllFieldsInSchemaByMappedName,
  getMappedEcsValue,
  mappedEcsSchemaFieldNames,
  virtualEcsSchema,
} from '../../../../lib/ecs';
import { escapeQueryValue } from '../../../../lib/keury';
import { DragEffects, DraggableWrapper } from '../../../drag_and_drop/draggable_wrapper';
import { escapeDataProviderId } from '../../../drag_and_drop/helpers';
import { Provider } from '../../data_providers/provider';
import { FormattedField } from './formatted_field';
import * as i18n from './translations';

const Label = styled.div`
  font-weight: bold;
`;

const allFieldsInSchemaByName = getAllFieldsInSchemaByMappedName(virtualEcsSchema);

export const DraggableValue = pure<{ data: Ecs; fieldName: string }>(({ data, fieldName }) => {
  const itemDataProvider = {
    enabled: true,
    id: escapeDataProviderId(`row-render-value-for-${data._id}-${fieldName}`),
    name: `${fieldName}: ${getMappedEcsValue({
      data,
      fieldName,
    })}`,
    queryMatch: {
      field: getOr(fieldName, fieldName, mappedEcsSchemaFieldNames),
      value: escapeQueryValue(
        getMappedEcsValue({
          data,
          fieldName,
        })
      ),
    },
    excluded: false,
    kqlQuery: '',
    and: [],
  };

  const field = allFieldsInSchemaByName[fieldName];
  const fieldType = field != null ? field.type : '';

  return { data, fieldName } ? (
    <DraggableWrapper
      key={`row-render-value-for-${data._id}-${fieldName}`}
      dataProvider={itemDataProvider}
      render={(dataProvider, _, snapshot) =>
        snapshot.isDragging ? (
          <DragEffects>
            <Provider dataProvider={dataProvider} />
          </DragEffects>
        ) : (
          <FormattedField data={data} fieldName={fieldName} fieldType={fieldType} />
        )
      }
    />
  ) : null;
});

export const SourceIp = pure(({ data }: { data: Ecs }) =>
  fieldExists({ data, fieldName: 'source.ip' }) ? (
    <>
      <EuiFlexItem>
        <Label>{i18n.SOURCE}</Label>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiFlexGroup gutterSize="none">
          <EuiFlexItem grow={false}>
            <DraggableValue
              data={data}
              data-test-subj="source-ip-and-port"
              fieldName={'source.ip'}
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            {fieldExists({ data, fieldName: 'source.port' }) ? ':' : null}
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <DraggableValue data={data} fieldName={'source.port'} />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    </>
  ) : null
);

export const DestinationIp = pure(({ data }: { data: Ecs }) =>
  fieldExists({ data, fieldName: 'destination.ip' }) ? (
    <>
      <EuiFlexItem>
        <Label>{i18n.DESTINATION}</Label>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiFlexGroup gutterSize="none">
          <EuiFlexItem grow={false}>
            <DraggableValue
              data={data}
              data-test-subj="destination-ip-and-port"
              fieldName={'destination.ip'}
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            {fieldExists({ data, fieldName: 'destination.port' }) ? ':' : null}
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <DraggableValue data={data} fieldName={'destination.port'} />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    </>
  ) : null
);

export const SourceDest = pure(({ data }: { data: Ecs }) => (
  <EuiFlexGroup justifyContent="spaceEvenly">
    <EuiFlexItem grow={false}>
      <EuiFlexGroup direction="column" alignItems="center" gutterSize="none">
        <SourceIp data={data} />
      </EuiFlexGroup>
    </EuiFlexItem>
    <EuiFlexItem grow={false}>
      <EuiFlexGroup direction="column" alignItems="center" gutterSize="none">
        <DestinationIp data={data} />
      </EuiFlexGroup>
    </EuiFlexItem>
  </EuiFlexGroup>
));
