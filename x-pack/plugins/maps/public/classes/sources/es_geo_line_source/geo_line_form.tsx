/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { IndexPattern } from 'src/plugins/data/public';
import { EuiFormRow } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { SingleFieldSelect } from '../../../components/single_field_select';
import { getTermsFields } from '../../../index_pattern_util';
import { indexPatterns } from '../../../../../../../src/plugins/data/public';

interface Props {
  indexPattern: IndexPattern;
  onSortFieldChange: (fieldName: string) => void;
  onSplitFieldChange: (fieldName: string) => void;
  sortField: string;
  splitField: string;
}

export function GeoLineForm(props: Props) {
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
          onChange={props.onSplitFieldChange}
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
          onChange={props.onSortFieldChange}
          fields={props.indexPattern.fields.filter(
            (field) => field.sortable && !indexPatterns.isNestedField(field)
          )}
          isClearable={false}
        />
      </EuiFormRow>
    </>
  );
}
