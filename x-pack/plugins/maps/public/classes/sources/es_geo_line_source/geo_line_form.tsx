/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { DataView } from '@kbn/data-plugin/common';
import { EuiFormRow, EuiSwitch, EuiSwitchEvent, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { indexPatterns } from '@kbn/data-plugin/public';
import { SingleFieldSelect } from '../../../components/single_field_select';
import { getTermsFields, getIsTimeseries } from '../../../index_pattern_util';

interface Props {
  indexPattern: DataView;
  groupByTimeseries: boolean;
  onGroupByTimeseriesChange: (groupByTimeseries: boolean) => void;
  onSortFieldChange: (fieldName: string) => void;
  onSplitFieldChange: (fieldName: string) => void;
  sortField: string;
  splitField: string;
}

export function GeoLineForm(props: Props) {
  const { isTimeseries, dimensionLabels } = useMemo(() => {
    const isTimeseries = getIsTimeseries(props.indexPattern);
    return {
      isTimeseries,
      dimensionLabels: isTimeseries
        ? props.indexPattern.fields
            .filter((field) => {
              return field.timeSeriesDimension;
            })
            .map((field) => {
              return field.displayName;
            })
        : [],
    };
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
        <EuiFormRow>
          <EuiToolTip
            position="top"
            content={i18n.translate('xpack.maps.source.esGeoLine.groupByTimeseriesTooltip', {
              defaultMessage:
                'When enabled, create a track for each unique time series. Dimensions: {dimensionLabels}',
              values: { dimensionLabels: dimensionLabels.join(',') },
            })}
          >
            <EuiSwitch
              label={i18n.translate('xpack.maps.source.esGeoLine.groupByTimeseriesLabel', {
                defaultMessage: 'Group by time series',
              })}
              checked={props.groupByTimeseries}
              onChange={(event: EuiSwitchEvent) => {
                props.onGroupByTimeseriesChange(event.target.checked);
              }}
            />
          </EuiToolTip>
        </EuiFormRow>
      )}
      {!props.groupByTimeseries && (
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
      )}
    </>
  );
}
