/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { get, getOr } from 'lodash/fp';
import * as React from 'react';
import { pure } from 'recompose';
import styled from 'styled-components';

import { BrowserFields } from '../../../../containers/source';
import { Ecs } from '../../../../graphql/types';
import { fieldExists, getMappedEcsValue, mappedEcsSchemaFieldNames } from '../../../../lib/ecs';
import { escapeQueryValue } from '../../../../lib/keury';
import { DragEffects, DraggableWrapper } from '../../../drag_and_drop/draggable_wrapper';
import { escapeDataProviderId } from '../../../drag_and_drop/helpers';
import { Provider } from '../../data_providers/provider';

import { FormattedFieldValue } from './formatted_field';
import * as i18n from './translations';

const Label = styled.div`
  font-weight: bold;
`;

const getField = (field: string, browserFields: BrowserFields) => {
  const splitField = field.split('.');
  if (splitField.length > 1) {
    return get([splitField[0], 'fields', field], browserFields);
  }
  return get(['base', 'fields', field], browserFields);
};

export const DraggableValue = pure<{ browserFields: BrowserFields; data: Ecs; fieldName: string }>(
  ({ browserFields, data, fieldName }) => {
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

    const field = getField(fieldName, browserFields);

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
            <FormattedFieldValue
              value={getMappedEcsValue({ data, fieldName })}
              fieldName={fieldName}
              fieldType={field.type || ''}
            />
          )
        }
      />
    ) : null;
  }
);

export const SourceIp = pure<{ browserFields: BrowserFields; data: Ecs }>(
  ({ browserFields, data }) =>
    fieldExists({ data, fieldName: 'source.ip' }) ? (
      <>
        <EuiFlexItem grow={false}>
          <Label>{i18n.SOURCE}</Label>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFlexGroup gutterSize="none">
            <EuiFlexItem grow={false}>
              <DraggableValue
                browserFields={browserFields}
                data={data}
                data-test-subj="source-ip-and-port"
                fieldName={'source.ip'}
              />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>:</EuiFlexItem>
            <EuiFlexItem grow={false}>
              <DraggableValue browserFields={browserFields} data={data} fieldName={'source.port'} />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </>
    ) : null
);

export const DestinationIp = pure<{ browserFields: BrowserFields; data: Ecs }>(
  ({ browserFields, data }) =>
    fieldExists({ data, fieldName: 'destination.ip' }) ? (
      <>
        <EuiFlexItem grow={false}>
          <Label>{i18n.DESTINATION}</Label>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFlexGroup gutterSize="none">
            <EuiFlexItem grow={false}>
              <DraggableValue
                browserFields={browserFields}
                data={data}
                data-test-subj="destination-ip-and-port"
                fieldName={'destination.ip'}
              />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>:</EuiFlexItem>
            <EuiFlexItem grow={false}>
              <DraggableValue
                browserFields={browserFields}
                data={data}
                fieldName={'destination.port'}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </>
    ) : null
);

export const SourceDest = pure<{ browserFields: BrowserFields; data: Ecs }>(
  ({ browserFields, data }) => (
    <EuiFlexGroup justifyContent="center">
      <EuiFlexItem grow={false}>
        <EuiFlexGroup direction="column" alignItems="center" gutterSize="none">
          <SourceIp browserFields={browserFields} data={data} />
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiFlexGroup direction="column" alignItems="center" gutterSize="none">
          <DestinationIp browserFields={browserFields} data={data} />
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  )
);
