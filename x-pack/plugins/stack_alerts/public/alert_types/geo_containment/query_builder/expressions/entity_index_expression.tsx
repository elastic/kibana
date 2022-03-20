/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Fragment, FunctionComponent, useEffect, useRef } from 'react';
import { EuiFormRow } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { DataPublicPluginStart } from 'src/plugins/data/public';
import { HttpSetup } from 'kibana/public';
import { useKibana } from '../../../../../../../../src/plugins/kibana_react/public';
import {
  IErrorObject,
  RuleTypeParamsExpressionProps,
} from '../../../../../../triggers_actions_ui/public';
import { ES_GEO_FIELD_TYPES } from '../../types';
import { GeoIndexPatternSelect } from '../util_components/geo_index_pattern_select';
import { SingleFieldSelect } from '../util_components/single_field_select';
import { ExpressionWithPopover } from '../util_components/expression_with_popover';
import { DataViewField, DataView } from '../../../../../../../../src/plugins/data/common';

interface Props {
  dateField: string;
  geoField: string;
  errors: IErrorObject;
  setAlertParamsDate: (date: string) => void;
  setAlertParamsGeoField: (geoField: string) => void;
  setRuleProperty: RuleTypeParamsExpressionProps['setRuleProperty'];
  setIndexPattern: (indexPattern: DataView) => void;
  indexPattern: DataView;
  isInvalid: boolean;
  data: DataPublicPluginStart;
}

interface KibanaDeps {
  http: HttpSetup;
}

export const EntityIndexExpression: FunctionComponent<Props> = ({
  setAlertParamsDate,
  setAlertParamsGeoField,
  errors,
  setIndexPattern,
  indexPattern,
  isInvalid,
  dateField: timeField,
  geoField,
  data,
  unifiedSearch
}) => {
  const { http } = useKibana<KibanaDeps>().services;
  const IndexPatternSelect = (unifiedSearch.ui && unifiedSearch.ui.IndexPatternSelect) || null;

  const usePrevious = <T extends unknown>(value: T): T | undefined => {
    const ref = useRef<T>();
    useEffect(() => {
      ref.current = value;
    });
    return ref.current;
  };

  const oldIndexPattern = usePrevious(indexPattern);
  const fields = useRef<{
    dateFields: DataViewField[];
    geoFields: DataViewField[];
  }>({
    dateFields: [],
    geoFields: [],
  });
  useEffect(() => {
    if (oldIndexPattern !== indexPattern) {
      fields.current.geoFields =
        (indexPattern.fields &&
          indexPattern.fields.length &&
          indexPattern.fields.filter((field: DataViewField) =>
            ES_GEO_FIELD_TYPES.includes(field.type)
          )) ||
        [];
      if (fields.current.geoFields.length) {
        setAlertParamsGeoField(fields.current.geoFields[0].name);
      }

      fields.current.dateFields =
        (indexPattern.fields &&
          indexPattern.fields.length &&
          indexPattern.fields.filter((field: DataViewField) => field.type === 'date')) ||
        [];
      if (fields.current.dateFields.length) {
        setAlertParamsDate(fields.current.dateFields[0].name);
      }
    }
  }, [indexPattern, oldIndexPattern, setAlertParamsDate, setAlertParamsGeoField]);

  const indexPopover = (
    <Fragment>
      <EuiFormRow id="geoIndexPatternSelect" fullWidth error={errors.index}>
        <GeoIndexPatternSelect
          onChange={(_indexPattern) => {
            // reset time field and expression fields if indices are deleted
            if (!_indexPattern) {
              return;
            }
            setIndexPattern(_indexPattern);
          }}
          value={indexPattern.id}
          IndexPatternSelectComponent={IndexPatternSelect}
          indexPatternService={data.indexPatterns}
          http={http}
          includedGeoTypes={ES_GEO_FIELD_TYPES}
        />
      </EuiFormRow>
      <EuiFormRow
        id="containmentTimeField"
        fullWidth
        label={
          <FormattedMessage
            id="xpack.stackAlerts.geoContainment.timeFieldLabel"
            defaultMessage="Time field"
          />
        }
      >
        <SingleFieldSelect
          placeholder={i18n.translate('xpack.stackAlerts.geoContainment.selectTimeLabel', {
            defaultMessage: 'Select time field',
          })}
          value={timeField}
          onChange={(_timeField: string | undefined) =>
            _timeField && setAlertParamsDate(_timeField)
          }
          fields={fields.current.dateFields}
        />
      </EuiFormRow>
      <EuiFormRow
        id="geoField"
        fullWidth
        label={i18n.translate('xpack.stackAlerts.geoContainment.geofieldLabel', {
          defaultMessage: 'Geospatial field',
        })}
      >
        <SingleFieldSelect
          placeholder={i18n.translate('xpack.stackAlerts.geoContainment.selectGeoLabel', {
            defaultMessage: 'Select geo field',
          })}
          value={geoField}
          onChange={(_geoField: string | undefined) =>
            _geoField && setAlertParamsGeoField(_geoField)
          }
          fields={fields.current.geoFields}
        />
      </EuiFormRow>
    </Fragment>
  );

  return (
    <ExpressionWithPopover
      isInvalid={isInvalid}
      value={indexPattern.title}
      defaultValue={i18n.translate('xpack.stackAlerts.geoContainment.entityIndexSelect', {
        defaultMessage: 'Select a data view and geo point field',
      })}
      popoverContent={indexPopover}
      expressionDescription={i18n.translate('xpack.stackAlerts.geoContainment.entityIndexLabel', {
        defaultMessage: 'index',
      })}
    />
  );
};
