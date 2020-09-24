/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, FunctionComponent } from 'react';
import { EuiFormRow } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { IErrorObject } from '../../../../../../types';
import { ES_GEO_SHAPE_TYPES, GeoThresholdAlertParams } from '../../types';
import { AlertsContextValue } from '../../../../../context/alerts_context';
import { GeoIndexPatternSelect } from '../util_components/geo_index_pattern_select';
import { SingleFieldSelect } from '../util_components/single_field_select';
import { ExpressionWithPopover } from '../util_components/expression_with_popover';
import { IFieldType } from '../../../../../../../../../../src/plugins/data/common/index_patterns/fields';
import { IIndexPattern } from '../../../../../../../../../../src/plugins/data/common/index_patterns';

interface Props {
  alertParams: GeoThresholdAlertParams;
  alertsContext: AlertsContextValue;
  errors: IErrorObject;
  boundaryIndexPattern: IIndexPattern;
  boundaryNameField?: string;
  setBoundaryIndexPattern: (boundaryIndexPattern?: IIndexPattern) => void;
  setBoundaryGeoField: (boundaryGeoField?: string) => void;
  setBoundaryNameField: (boundaryNameField?: string) => void;
}

export const BoundaryIndexExpression: FunctionComponent<Props> = ({
  alertParams,
  alertsContext,
  errors,
  boundaryIndexPattern,
  boundaryNameField,
  setBoundaryIndexPattern,
  setBoundaryGeoField,
  setBoundaryNameField,
}) => {
  const BOUNDARY_NAME_ENTITY_TYPES = ['string', 'number', 'ip'];
  const { dataUi, dataIndexPatterns, http } = alertsContext;
  const IndexPatternSelect = (dataUi && dataUi.IndexPatternSelect) || null;
  const { boundaryGeoField } = alertParams;

  const indexPopover = (
    <Fragment>
      <EuiFormRow id="geoIndexPatternSelect" fullWidth error={errors.index}>
        <GeoIndexPatternSelect
          onChange={(_indexPattern) => {
            if (!_indexPattern) {
              return;
            }
            setBoundaryIndexPattern(_indexPattern);
          }}
          value={boundaryIndexPattern.id}
          IndexPatternSelectComponent={IndexPatternSelect}
          indexPatternService={dataIndexPatterns}
          http={http}
        />
      </EuiFormRow>
      <EuiFormRow
        id="geoField"
        fullWidth
        label={i18n.translate('xpack.triggersActionsUI.geoThreshold.geofieldLabel', {
          defaultMessage: 'Geospatial field',
        })}
      >
        <SingleFieldSelect
          placeholder={i18n.translate('xpack.triggersActionsUI.geoThreshold.selectLabel', {
            defaultMessage: 'Select geo field',
          })}
          value={boundaryGeoField}
          onChange={setBoundaryGeoField}
          fields={
            (boundaryIndexPattern.fields.length &&
              boundaryIndexPattern.fields.filter((field: IFieldType) =>
                ES_GEO_SHAPE_TYPES.includes(field.type)
              )) ||
            []
          }
        />
      </EuiFormRow>
      <EuiFormRow
        id="boundaryNameFieldSelect"
        fullWidth
        label={i18n.translate('xpack.triggersActionsUI.geoThreshold.boundaryNameSelectLabel', {
          defaultMessage: 'Human-readable boundary name (optional)',
        })}
      >
        <SingleFieldSelect
          placeholder={i18n.translate('xpack.triggersActionsUI.geoThreshold.boundaryNameSelect', {
            defaultMessage: 'Select boundary name',
          })}
          value={boundaryNameField || null}
          onChange={setBoundaryNameField}
          fields={boundaryIndexPattern.fields.filter(
            (field: IFieldType) =>
              BOUNDARY_NAME_ENTITY_TYPES.includes(field.type) &&
              !field.name.startsWith('_') &&
              !field.name.endsWith('keyword')
          )}
        />
      </EuiFormRow>
    </Fragment>
  );

  return (
    <ExpressionWithPopover
      defaultValue={'Select an index pattern and geo shape field'}
      value={boundaryIndexPattern.title}
      popoverContent={indexPopover}
      expressionDescription={i18n.translate('xpack.triggersActionsUI.geoThreshold.indexLabel', {
        defaultMessage: 'index',
      })}
    />
  );
};
