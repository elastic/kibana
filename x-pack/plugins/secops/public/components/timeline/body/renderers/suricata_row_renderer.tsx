/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButton } from '@elastic/eui';
import { get, getOr } from 'lodash/fp';
import React from 'react';
import { pure } from 'recompose';
import styled, { keyframes } from 'styled-components';

import { createLinkWithSignature, RowRenderer } from '.';
import { Ecs } from '../../../../graphql/types';
import {
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

export const dropInEffect = keyframes`
  0% {
    border: 1px solid;
    border-color: #d9d9d9;
    transform: scale(1.050);
    box-shadow: 0 2px 2px -1px rgba(153, 153, 153, 0.3), 0 1px 5px -2px rgba(153, 153, 153, 0.3);
  }

  35%, 80% {
    border: 1px solid;
    border-color: #d9d9d9;
    transform: scale(1.010);
    box-shadow: 0 2px 2px -1px rgba(153, 153, 153, 0.3), 0 1px 5px -2px rgba(153, 153, 153, 0.3);
  }

  100% {
    border-color: transparent;
    border-left: 2px solid #8ecce3;
    transform: scale(1);
    box-shadow: unset;
  }
`;

const SuricataRow = styled.div`
  width: 100%;
  overflow: hidden;
  &:hover {
    border: 1px solid ${props => props.theme.eui.euiColorMediumShade};
  }
`;

const SuricataSignature = styled.div`
  align-items: center;
  display: flex;
  flex-direction: column;
  margin-top: 5px;
`;

const Details = styled.div`
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  margin: 5px;
  min-width: 340px;
`;

const LabelValuePairContainer = styled.div`
  align-items: center;
  display: flex;
  flex-direction: column;
`;

const Label = styled.div`
  font-weight: bold;
`;

const allFieldsInSchemaByName = getAllFieldsInSchemaByMappedName(virtualEcsSchema);

export const fieldExists = ({ data, fieldName }: { data: Ecs; fieldName: string }): boolean =>
  getMappedEcsValue({ data, fieldName }) != null;

const DraggableValue = pure<{ data: Ecs; fieldName: string }>(({ data, fieldName }) => {
  const itemDataProvider = {
    enabled: true,
    id: escapeDataProviderId(`id-suricata-row-render-value-for-${fieldName}-${data._id!}`),
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

  return fieldExists({ data, fieldName }) ? (
    <DraggableWrapper
      key={`suricata-row-render-value-for-${fieldName}-${data._id!}`}
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

export const ValuesContainer = styled.div`
  display: flex;
`;

export const suricataRowRenderer: RowRenderer = {
  isInstance: (ecs: Ecs) => {
    if (ecs && ecs.event && ecs.event.module && ecs.event.module.toLowerCase() === 'suricata') {
      return true;
    }
    return false;
  },
  renderRow: (data: Ecs, children: React.ReactNode) => {
    const signature = get('suricata.eve.alert.signature', data) as string;
    return (
      <SuricataRow>
        {children}
        {signature != null ? (
          <SuricataSignature>
            <EuiButton
              key={data._id!}
              fill
              size="s"
              href={createLinkWithSignature(signature)}
              target="_blank"
            >
              {signature}
            </EuiButton>
            <Details>
              {fieldExists({ data, fieldName: 'source.ip' }) ? (
                <LabelValuePairContainer>
                  <Label>{i18n.SOURCE}</Label>
                  <ValuesContainer>
                    <DraggableValue
                      data={data}
                      data-test-subj="source-ip-and-port"
                      fieldName={'source.ip'}
                    />
                    {fieldExists({ data, fieldName: 'source.port' }) ? ':' : null}
                    <DraggableValue data={data} fieldName={'source.port'} />
                  </ValuesContainer>
                </LabelValuePairContainer>
              ) : null}

              {fieldExists({ data, fieldName: 'destination.ip' }) ? (
                <LabelValuePairContainer>
                  <Label>{i18n.DESTINATION}</Label>
                  <ValuesContainer>
                    <DraggableValue
                      data={data}
                      data-test-subj="destination-ip-and-port"
                      fieldName={'destination.ip'}
                    />
                    {fieldExists({ data, fieldName: 'destination.port' }) ? ':' : null}
                    <DraggableValue data={data} fieldName={'destination.port'} />
                  </ValuesContainer>
                </LabelValuePairContainer>
              ) : null}
            </Details>
          </SuricataSignature>
        ) : null}
      </SuricataRow>
    );
  },
};
