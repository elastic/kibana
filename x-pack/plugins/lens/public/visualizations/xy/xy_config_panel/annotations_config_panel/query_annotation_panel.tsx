/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFormRow } from '@elastic/eui';
import type { Query } from '@kbn/data-plugin/common';
import type { PointInTimeQueryEventAnnotationConfig } from '@kbn/event-annotation-plugin/common';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { QueryInput } from '../../../../indexpattern_datasource/query_input';
import {
  fieldExists,
  FieldOption,
  FieldOptionValue,
  FieldPicker,
} from '../../../../shared_components';
import type { FramePublicAPI } from '../../../../types';
import type { XYState, XYAnnotationLayerConfig } from '../../types';

export const defaultQuery: Query = {
  query: '',
  language: 'kuery',
};

export const ConfigPanelQueryAnnotation = ({
  annotation,
  frame,
  state,
  onChange,
  layer,
}: {
  annotation?: PointInTimeQueryEventAnnotationConfig;
  onChange: (annotations: Partial<PointInTimeQueryEventAnnotationConfig> | undefined) => void;
  frame: FramePublicAPI;
  state: XYState;
  layer: XYAnnotationLayerConfig;
}) => {
  const inputQuery = annotation?.query ?? defaultQuery;
  const currentIndexPattern = frame.dataViews.indexPatterns[layer.indexPatternId];
  // list only supported field by operation, remove the rest
  const options = currentIndexPattern.fields
    .filter((field) => field.type === 'date' && field.displayName)
    .map((field) => {
      return {
        label: field.displayName,
        value: {
          type: 'field',
          field: field.name,
          dataType: field.type,
        },
        exists: fieldExists(frame.dataViews.existingFields[currentIndexPattern.title], field.name),
        compatible: true,
        'data-test-subj': `lns-fieldOption-${field.name}`,
      } as FieldOption<FieldOptionValue>;
    });

  const selectedField = annotation?.key.field;
  return (
    <>
      <EuiFormRow
        display="rowCompressed"
        className="lnsRowCompressedMargin"
        fullWidth
        label={i18n.translate('xpack.lens.xyChart.annotation.queryField', {
          defaultMessage: 'Target date field',
        })}
      >
        <FieldPicker
          options={options}
          selectedOptions={
            selectedField
              ? [
                  {
                    label: selectedField,
                    value: { type: 'field', field: selectedField },
                  },
                ]
              : []
          }
          onChoose={function (choice: FieldOptionValue | undefined): void {
            if (choice) {
              onChange({ key: { type: 'point_in_time', field: choice.field } });
            }
          }}
          fieldIsInvalid={false}
          data-test-subj="annotation-query-based-field-picker"
        />
      </EuiFormRow>
      <EuiFormRow
        display="rowCompressed"
        className="lnsRowCompressedMargin"
        fullWidth
        label={i18n.translate('xpack.lens.xyChart.annotation.queryInput', {
          defaultMessage: 'Annotation query',
        })}
      >
        <QueryInput
          value={inputQuery}
          onChange={function (input: Query): void {
            onChange({ query: input });
          }}
          indexPatternTitle={frame.dataViews.indexPatterns[layer.indexPatternId].title}
          isInvalid={false}
          onSubmit={() => {}}
          data-test-subj="annotation-query-based-query-input"
          placeholder={
            inputQuery.language === 'kuery'
              ? i18n.translate('xpack.lens.annotations.query.queryPlaceholderKql', {
                  defaultMessage: '{example}',
                  values: { example: 'method : "GET"' },
                })
              : i18n.translate('xpack.lens.annotations.query.queryPlaceholderLucene', {
                  defaultMessage: '{example}',
                  values: { example: 'method:GET' },
                })
          }
        />
      </EuiFormRow>
    </>
  );
};
