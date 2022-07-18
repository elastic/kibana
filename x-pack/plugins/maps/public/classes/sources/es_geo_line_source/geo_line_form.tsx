/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { DataView } from '@kbn/data-plugin/common';
import { EuiFormRow } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { indexPatterns } from '@kbn/data-plugin/public';
import { SingleFieldSelect } from '../../../components/single_field_select';
import { getTermsFields } from '../../../index_pattern_util';

interface Props {
  indexPattern: DataView;
  onSortFieldChange: (fieldName: string) => void;
  onSplitFieldChange: (fieldName: string) => void;
  sortField: string;
  splitField: string;
}

export function GeoLineForm(props: Props) {
  function onSortFieldChange(fieldName: string | undefined) {
    if (fieldName !== undefined) {
      props.onSortFieldChange(fieldName);
    }
  }
  function onSplitFieldChange(fieldName: string | undefined) {
    if (fieldName !== undefined) {
      props.onSplitFieldChange(fieldName);
    }
  }
  return (
    <>
      <EuiFormRow
        label={i18n.translate('xpack.maps.source.esGeoLine.splitFieldLabel', {
          defaultMessage: 'Entity',
        })}
      >
        <SingleFieldSelect
          placeholder={i18n.translate('xpack.maps.source.esGeoLine.splitFieldPlaceholder', {
            defaultMessage: 'Select entity field',
          })}
          value={props.splitField}
          onChange={onSplitFieldChange}
          fields={getTermsFields(props.indexPattern.fields)}
          isClearable={false}
        />
      </EuiFormRow>

      <EuiFormRow
        label={i18n.translate('xpack.maps.source.esGeoLine.sortFieldLabel', {
          defaultMessage: 'Sort',
        })}
      >
        <SingleFieldSelect
          placeholder={i18n.translate('xpack.maps.source.esGeoLine.sortFieldPlaceholder', {
            defaultMessage: 'Select sort field',
          })}
          value={props.sortField}
          onChange={onSortFieldChange}
          fields={props.indexPattern.fields.filter((field) => {
            const isSplitField = props.splitField ? field.name === props.splitField : false;
            return (
              !isSplitField &&
              field.sortable &&
              !indexPatterns.isNestedField(field) &&
              ['number', 'date'].includes(field.type)
            );
          })}
          isClearable={false}
        />
      </EuiFormRow>
    </>
  );
}
