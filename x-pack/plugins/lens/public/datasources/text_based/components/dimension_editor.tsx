/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState, useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiFormRow } from '@elastic/eui';
import { euiThemeVars } from '@kbn/ui-theme';
import type { ExpressionsStart } from '@kbn/expressions-plugin/public';
import { fetchFieldsFromESQL } from '@kbn/text-based-editor';
import type { DatasourceDimensionEditorProps, DataType } from '../../../types';
import { FieldSelect, type FieldOptionCompatible } from './field_select';
import type { TextBasedPrivateState } from '../types';
import { isNotNumeric, isNumeric } from '../utils';

export type TextBasedDimensionEditorProps =
  DatasourceDimensionEditorProps<TextBasedPrivateState> & {
    expressions: ExpressionsStart;
  };

export function TextBasedDimensionEditor(props: TextBasedDimensionEditorProps) {
  const [allColumns, setAllColumns] = useState<FieldOptionCompatible[]>([]);
  const query = props.state.layers[props.layerId]?.query;

  useEffect(() => {
    // in case the columns are not in the cache, I refetch them
    async function fetchColumns() {
      if (query) {
        const table = await fetchFieldsFromESQL(
          { esql: `${query.esql} | limit 0` },
          props.expressions
        );
        if (table) {
          const hasNumberTypeColumns = table.columns?.some(isNumeric);
          const columns = table.columns.map((col) => {
            return {
              id: col.id,
              name: col.name,
              meta: col?.meta ?? { type: 'number' },
              compatible:
                props.isMetricDimension && hasNumberTypeColumns
                  ? props.filterOperations({
                      dataType: col?.meta?.type as DataType,
                      isBucketed: Boolean(isNotNumeric(col)),
                      scale: 'ordinal',
                    })
                  : true,
            };
          });
          setAllColumns(columns);
        }
      }
    }
    fetchColumns();
  }, [props, props.expressions, query]);

  const selectedField = useMemo(() => {
    const layerColumns = props.state.layers[props.layerId].columns;
    return layerColumns?.find((column) => column.columnId === props.columnId);
  }, [props.columnId, props.layerId, props.state.layers]);

  return (
    <>
      <EuiFormRow
        data-test-subj="text-based-languages-field-selection-row"
        label={i18n.translate('xpack.lens.textBasedLanguages.chooseField', {
          defaultMessage: 'Field',
        })}
        fullWidth
        className="lnsIndexPatternDimensionEditor--padded"
      >
        <FieldSelect
          existingFields={allColumns ?? []}
          selectedField={selectedField}
          onChoose={(choice) => {
            const meta = allColumns?.find((f) => f.name === choice.field)?.meta;
            const newColumn = {
              columnId: props.columnId,
              fieldName: choice.field,
              meta,
            };
            return props.setState(
              !selectedField
                ? {
                    ...props.state,
                    layers: {
                      ...props.state.layers,
                      [props.layerId]: {
                        ...props.state.layers[props.layerId],
                        columns: [...props.state.layers[props.layerId].columns, newColumn],
                      },
                    },
                  }
                : {
                    ...props.state,
                    layers: {
                      ...props.state.layers,
                      [props.layerId]: {
                        ...props.state.layers[props.layerId],
                        columns: props.state.layers[props.layerId].columns.map((col) =>
                          col.columnId !== props.columnId
                            ? col
                            : { ...col, fieldName: choice.field, meta }
                        ),
                      },
                    },
                  }
            );
          }}
        />
      </EuiFormRow>
      {props.dataSectionExtra && (
        <div
          style={{
            paddingLeft: euiThemeVars.euiSize,
            paddingRight: euiThemeVars.euiSize,
          }}
        >
          {props.dataSectionExtra}
        </div>
      )}
    </>
  );
}
