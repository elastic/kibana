/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiTable, EuiTableRow, EuiTableRowCell, EuiText } from '@elastic/eui';
import React, { useMemo } from 'react';
import { css } from '@emotion/css';
import type { Entity } from '../../../common/entities';

export function EntityMetadata<TEntity extends Entity>({ entity }: { entity: TEntity }) {
  const fields = useMemo(() => {
    return Object.entries(entity.properties).map(([field, value]) => {
      return {
        field,
        value,
      };
    });
  }, [entity]);

  return (
    <EuiTable>
      {fields.map(({ field, value }) => (
        <EuiTableRow
          key={field}
          className={css`
            padding: 24px;
          `}
        >
          <EuiTableRowCell
            className={css`
              vertical-align: top;
              width: 240px;
            `}
          >
            <EuiText
              size="s"
              className={css`
                font-weight: 600;
              `}
            >
              {field}
            </EuiText>
          </EuiTableRowCell>
          <EuiTableRowCell>
            <EuiText size="xs">{typeof value === 'string' ? value : JSON.stringify(value)}</EuiText>
          </EuiTableRowCell>
        </EuiTableRow>
      ))}
    </EuiTable>
  );
}
