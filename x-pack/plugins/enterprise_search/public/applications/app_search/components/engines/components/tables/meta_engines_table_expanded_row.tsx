/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiBasicTable, EuiHealth, EuiTitle } from '@elastic/eui';

import { EngineDetails } from '../../../engine/types';
import { SOURCE_ENGINES_TITLE } from '../../constants';

import {
  BLANK_COLUMN,
  CREATED_AT_COLUMN,
  DOCUMENT_COUNT_COLUMN,
  FIELD_COUNT_COLUMN,
  NAME_COLUMN,
} from './shared_columns';

import './meta_engines_table_expanded_row.scss';

interface MetaEnginesTableExpandedRowProps {
  sourceEngines: EngineDetails[];
  conflictingEngines: Set<string>;
}

export const MetaEnginesTableExpandedRow: React.FC<MetaEnginesTableExpandedRowProps> = ({
  sourceEngines,
  conflictingEngines,
}) => (
  <div className="metaEnginesSourceEnginesTable">
    <EuiTitle size="xs" className="eui-textCenter">
      <h3>{SOURCE_ENGINES_TITLE}</h3>
    </EuiTitle>
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
        BLANK_COLUMN,
        DOCUMENT_COUNT_COLUMN,
        {
          ...FIELD_COUNT_COLUMN,
          render: (_, engineDetails) => (
            <>
              {conflictingEngines.has(engineDetails.name) ? (
                <EuiHealth color="warning">{engineDetails.field_count}</EuiHealth>
              ) : (
                engineDetails.field_count
              )}
            </>
          ),
        },
        BLANK_COLUMN,
      ]}
    />
  </div>
);
