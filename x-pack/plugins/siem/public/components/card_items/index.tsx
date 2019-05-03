/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  // @ts-ignore
  EuiCard,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
} from '@elastic/eui';
import numeral from '@elastic/numeral';
import React from 'react';
import { pure } from 'recompose';

import { getEmptyTagValue } from '../empty_value';

export interface CardItem {
  key: string;
  description: string;
  value: number | undefined | null;
}

export interface CardItems {
  fields: CardItem[];
  description?: string;
}

export interface CardItemsProps extends CardItems {
  isLoading: boolean;
  key: string;
}

const CardTitle = pure<{ isLoading: boolean; value: number | null | undefined }>(
  ({ isLoading, value }) => (
    <>
      {isLoading ? (
        <EuiLoadingSpinner size="m" />
      ) : value != null ? (
        numeral(value).format('0,0')
      ) : (
        getEmptyTagValue()
      )}
    </>
  )
);

export const CardItemsComponent = pure<CardItemsProps>(
  ({ fields, description, isLoading, key }) => (
    <EuiFlexItem key={`card-items-${key}`}>
      {fields.length === 1 ? (
        <EuiCard
          title={<CardTitle isLoading={isLoading} value={fields[0].value} />}
          description={fields[0].description}
        />
      ) : (
        <EuiCard
          title={fields.map(field => (
            <EuiFlexGroup
              key={`card-items-field-${field.key}`}
              gutterSize="s"
              justifyContent="spaceBetween"
            >
              <EuiFlexItem grow={false} component="span">
                <CardTitle isLoading={isLoading} value={field.value} />
              </EuiFlexItem>
              <EuiFlexItem grow={false} component="span">
                {field.description}
              </EuiFlexItem>
            </EuiFlexGroup>
          ))}
          description={description}
        />
      )}
    </EuiFlexItem>
  )
);
