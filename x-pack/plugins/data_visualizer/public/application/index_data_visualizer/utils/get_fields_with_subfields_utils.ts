/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { DataView, DataViewField } from '@kbn/data-views-plugin/common';
import { isDefined } from '@kbn/ml-is-defined';
import type { DataVisualizerGridInput } from '../embeddables/grid_embeddable/types';

/**
 * Helper logic to add multi-fields to the table for embeddables outside of Index data visualizer
 * For example, adding {field} will also add {field.keyword} if it exists
 * @param indexPatternTitle
 * @returns
 */
export const getFieldsWithSubFields = ({
  input,
  currentDataView,
  shouldGetSubfields = false,
}: {
  input: DataVisualizerGridInput;
  currentDataView: DataView;
  shouldGetSubfields: boolean;
}) => {
  const dataViewFields: DataViewField[] = currentDataView.fields;
  const visibleFieldsWithSubFields = shouldGetSubfields
    ? [
        ...new Set([
          ...dataViewFields
            .filter((field) => {
              if (input?.visibleFieldNames?.length === 0) return true;
              const visibleNames = input?.visibleFieldNames ?? [];
              if (visibleNames.includes(field.name)) return true;
              if (field.getSubtypeMulti) {
                const parent = field.getSubtypeMulti()?.multi?.parent;
                const matchesParent = parent ? visibleNames.indexOf(parent) > -1 : false;
                if (matchesParent) {
                  return true;
                }
              }
              return false;
            })
            .map((f) => f.name),
          ...(input.fieldsToFetch ?? []),
          ,
        ]),
      ].filter(isDefined)
    : undefined;
  return {
    visibleFieldNames: shouldGetSubfields ? visibleFieldsWithSubFields : input.visibleFieldNames,
    fieldsToFetch: Array.isArray(visibleFieldsWithSubFields)
      ? [...visibleFieldsWithSubFields]
      : undefined,
  };
};
