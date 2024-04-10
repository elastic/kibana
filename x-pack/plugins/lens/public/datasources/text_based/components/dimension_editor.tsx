/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiFormRow } from '@elastic/eui';
import { euiThemeVars } from '@kbn/ui-theme';
import type { ExpressionsStart } from '@kbn/expressions-plugin/public';
import type { DatasourceDimensionEditorProps, DataType } from '../../../types';
import { FieldSelect } from './field_select';
import type { TextBasedPrivateState } from '../types';
import { retrieveLayerColumnsFromCache, getColumnsFromCache } from '../fieldlist_cache';
import { isNotNumeric, isNumeric } from '../utils';

export type TextBasedDimensionEditorProps =
  DatasourceDimensionEditorProps<TextBasedPrivateState> & {
    expressions: ExpressionsStart;
  };

export function TextBasedDimensionEditor(props: TextBasedDimensionEditorProps) {
  const query = props.state.layers[props.layerId]?.query;

  const allColumns = retrieveLayerColumnsFromCache(
    props.state.layers[props.layerId]?.columns ?? [],
    query
  );
  const allFields = query ? getColumnsFromCache(query) : [];
  const hasNumberTypeColumns = allColumns?.some(isNumeric);
  const fields = allFields.map((col) => {
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
  const selectedField = allColumns?.find((column) => column.columnId === props.columnId);

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
          existingFields={fields ?? []}
          selectedField={selectedField}
          onChoose={(choice) => {
            const meta = fields?.find((f) => f.name === choice.field)?.meta;
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
