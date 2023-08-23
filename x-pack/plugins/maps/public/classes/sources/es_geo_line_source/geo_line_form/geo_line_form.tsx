/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { DataView } from '@kbn/data-plugin/common';
import { EuiFormRow } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { indexPatterns } from '@kbn/data-plugin/public';
import { SingleFieldSelect } from '../../../../components/single_field_select';
import { getTermsFields, getIsTimeseries } from '../../../../index_pattern_util';
import { ENTITY_INPUT_LABEL, SORT_INPUT_LABEL } from './i18n_constants';
import { GroupByButtonGroup } from './group_by_button_group';
import { GroupByLabel } from './group_by_label';
import { SizeSlider } from './size_slider';

interface Props {
  isColumnCompressed: boolean;
  indexPattern: DataView;
  groupByTimeseries: boolean;
  lineSimplificationSize: number;
  onGroupByTimeseriesChange: (groupByTimeseries: boolean) => void;
  onLineSimplificationSizeChange: (lineSimplificationSize: number) => void;
  onSortFieldChange: (fieldName: string) => void;
  onSplitFieldChange: (fieldName: string) => void;
  sortField: string;
  splitField: string;
}

export function GeoLineForm(props: Props) {
  const isTimeseries = useMemo(() => {
    return getIsTimeseries(props.indexPattern);
  }, [props.indexPattern]);

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
      {isTimeseries && (
        <EuiFormRow
          label={<GroupByLabel />}
          display={props.isColumnCompressed ? 'columnCompressed' : 'row'}
        >
          <GroupByButtonGroup
            groupByTimeseries={props.groupByTimeseries}
            onGroupByTimeseriesChange={props.onGroupByTimeseriesChange}
          />
        </EuiFormRow>
      )}
      {props.groupByTimeseries ? (
        <EuiFormRow
          label={i18n.translate('xpack.maps.esGeoLine.lineSImplificationSizeLabel', {
            defaultMessage: 'Simplification threshold',
          })}
          helpText={i18n.translate('xpack.maps.esGeoLine.lineSImplificationSizeHelpText', {
            defaultMessage:
              'The maximum number of points for each track. Track is simplifed when threshold is exceeded. Use smaller values for better performance.',
          })}
          display={props.isColumnCompressed ? 'columnCompressed' : 'row'}
        >
          <SizeSlider
            value={props.lineSimplificationSize}
            onChange={props.onLineSimplificationSizeChange}
          />
        </EuiFormRow>
      ) : (
        <>
          <EuiFormRow
            label={ENTITY_INPUT_LABEL}
            display={props.isColumnCompressed ? 'columnCompressed' : 'row'}
          >
            <SingleFieldSelect
              placeholder={i18n.translate('xpack.maps.source.esGeoLine.splitFieldPlaceholder', {
                defaultMessage: 'Select entity field',
              })}
              value={props.splitField}
              onChange={onSplitFieldChange}
              fields={getTermsFields(props.indexPattern.fields)}
              isClearable={false}
              compressed={props.isColumnCompressed}
            />
          </EuiFormRow>

          <EuiFormRow
            label={SORT_INPUT_LABEL}
            display={props.isColumnCompressed ? 'columnCompressed' : 'row'}
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
              compressed={props.isColumnCompressed}
            />
          </EuiFormRow>
        </>
      )}
    </>
  );
}
