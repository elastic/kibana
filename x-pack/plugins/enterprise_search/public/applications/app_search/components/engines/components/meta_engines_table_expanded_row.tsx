/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiBasicTable, EuiHealth, EuiTextAlign, EuiTitle } from '@elastic/eui';

import { EngineDetails } from '../../engine/types';
import {
  CREATED_AT_COLUMN,
  DOCUMENT_COUNT_COLUMN,
  FIELD_COUNT_COLUMN,
  NAME_COLUMN,
} from '../engines_table';

import './meta_engines_table_expanded_row.scss';

interface MetaEnginesTableExpandedRowProps {
  sourceEngines: EngineDetails[];
  conflictingEngines: Set<string>;
}

export const MetaEnginesTableExpandedRow: React.FC<MetaEnginesTableExpandedRowProps> = ({
  sourceEngines,
  conflictingEngines,
}) => (
  <div className="meta-engines__source-engines-table">
    <EuiTextAlign textAlign="center">
      <EuiTitle size="xs">
        <h3>Source Engines</h3>
      </EuiTitle>
    </EuiTextAlign>
    <EuiBasicTable
      items={sourceEngines}
      columns={[
        {
          ...NAME_COLUMN,
          mobileOptions: {
            ...NAME_COLUMN.mobileOptions,
            // Note: the below props are valid props per https://elastic.github.io/eui/#/tabular-content/tables (Responsive tables), but EUI's types have a bug reporting it as an error
            // @ts-ignore
            enlarge: false,
          },
        },
        CREATED_AT_COLUMN,
        {
          render: () => <></>, // This is a blank column in place of the `Language` column
        },
        DOCUMENT_COUNT_COLUMN,
        {
          ...FIELD_COUNT_COLUMN,
          render: (_, engineDetails) => (
            <>
              {conflictingEngines.has(name) ? (
                <EuiHealth color="warning">{engineDetails.field_count}</EuiHealth>
              ) : (
                engineDetails.field_count
              )}
            </>
          ),
        },
        {
          render: () => <></>, // This is a blank column in place of the `Actions` column
        },
      ]}
    />
  </div>
);
