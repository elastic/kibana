/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { EuiExpression, EuiToken } from '@elastic/eui';
import { ExpressionContainer, ValueContainer, EuiFlexGroupNested } from '../conditions.styles';

import type { Entry } from '../types';

import * as i18n from '../../translations';
import { getValue, getValueExpression } from './entry_content.helper';

export const EntryContent = memo(
  ({
    entry,
    index,
    isNestedEntry = false,
    dataTestSubj,
  }: {
    entry: Entry;
    index: number;
    isNestedEntry?: boolean;
    dataTestSubj?: string;
  }) => {
    const { field, type } = entry;
    const value = getValue(entry);
    const operator = 'operator' in entry ? entry.operator : '';

    const entryKey = `${field}${type}${value}${index}`;
    return (
      <div data-test-subj={`${dataTestSubj}-${entryKey}-condition`} key={entryKey}>
        <ExpressionContainer>
          {isNestedEntry ? (
            <EuiFlexGroupNested
              data-test-subj={`nested-${entryKey}-condition`}
              direction="row"
              alignItems="center"
              gutterSize="m"
            >
              <EuiToken iconType="tokenNested" size="s" />

              <ValueContainer>
                <EuiExpression description="" value={field} color="subdued" />
                {getValueExpression(type, operator, value)}
              </ValueContainer>
            </EuiFlexGroupNested>
          ) : (
            <>
              <EuiExpression
                description={index === 0 ? '' : i18n.CONDITION_AND}
                value={field}
                color={index === 0 ? 'primary' : 'subdued'}
              />

              {getValueExpression(type, operator, value)}
            </>
          )}
        </ExpressionContainer>
      </div>
    );
  }
);
EntryContent.displayName = 'EntryContent';
