/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFormRow } from '@elastic/eui';
import type { Query } from '@kbn/data-plugin/common';
import type { QueryPointEventAnnotationConfig } from '@kbn/event-annotation-plugin/common';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { useExistingFieldsReader } from '@kbn/unified-field-list-plugin/public';
import {
  FieldOption,
  FieldOptionValue,
  FieldPicker,
  FilterQueryInput,
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
  queryInputShouldOpen,
}: {
  annotation?: QueryPointEventAnnotationConfig;
  onChange: (annotations: Partial<QueryPointEventAnnotationConfig> | undefined) => void;
  frame: FramePublicAPI;
  state: XYState;
  layer: XYAnnotationLayerConfig;
  queryInputShouldOpen?: boolean;
}) => {
  const currentIndexPattern = frame.dataViews.indexPatterns[layer.indexPatternId];
  const { hasFieldData } = useExistingFieldsReader();
  // list only date fields
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
        exists: hasFieldData(currentIndexPattern.id, field.name),
        compatible: true,
        'data-test-subj': `lns-fieldOption-${field.name}`,
      } as FieldOption<FieldOptionValue>;
    });

  const selectedField =
    annotation?.timeField || currentIndexPattern.timeFieldName || options[0]?.value.field;
  const fieldIsValid = selectedField
    ? Boolean(currentIndexPattern.getFieldByName(selectedField))
    : true;

  return (
    <>
      <EuiFormRow
        hasChildLabel
        display="rowCompressed"
        className="lnsRowCompressedMargin"
        fullWidth
        label={i18n.translate('xpack.lens.xyChart.annotation.queryInput', {
          defaultMessage: 'Annotation query',
        })}
        data-test-subj="annotation-query-based-query-input"
      >
        <FilterQueryInput
          initiallyOpen={queryInputShouldOpen}
          label=""
          inputFilter={annotation?.filter ?? defaultQuery}
          onChange={(query: Query) => {
            onChange({ filter: { type: 'kibana_query', ...query } });
          }}
          data-test-subj="lnsXY-annotation-query-based-query-input"
          indexPattern={currentIndexPattern}
        />
      </EuiFormRow>

      <EuiFormRow
        display="rowCompressed"
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
              onChange({ timeField: choice.field });
            }
          }}
          fieldIsInvalid={!fieldIsValid}
          data-test-subj="lnsXY-annotation-query-based-field-picker"
        />
      </EuiFormRow>
    </>
  );
};
