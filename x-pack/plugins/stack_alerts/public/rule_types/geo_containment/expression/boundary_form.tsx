/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiFormRow, EuiPanel, EuiSkeletonText, EuiSpacer, EuiTitle } from '@elastic/eui';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { UnifiedSearchPublicPluginStart } from '@kbn/unified-search-plugin/public';
import { DataViewSelect } from './data_view_select';
import { SingleFieldSelect } from './single_field_select';

export const BOUNDARY_GEO_FIELD_TYPES = ['geo_shape'];

function getGeoFields(fields: DataViewField[]) {
  return fields.filter((field: DataViewField) => BOUNDARY_GEO_FIELD_TYPES.includes(field.type));
}

function getNameFields(fields: DataViewField[]) {
  return fields.filter(
    (field: DataViewField) =>
      ['string', 'number', 'ip'].includes(field.type) &&
      !field.name.startsWith('_') &&
      !field.name.endsWith('keyword')
  );
}

interface Props {
  data: DataPublicPluginStart;
  getValidationError: (key: string) => string | null;
  ruleParams: GeoContainmentAlertParams;
  setDataViewId: (id: string) => void;
  setDataViewTitle: (title: string) => void;
  setGeoField: (fieldName: string) => void;
  setNameField: (fieldName: string) => void;
  unifiedSearch: UnifiedSearchPublicPluginStart;
}

export const BoundaryForm = (props: Props) => {
  const [isLoading, setIsLoading] = useState(false);
  const [dataView, setDataView] = useState<undefined | DataView>();
  const [dataViewNotFound, setDataViewNotFound] = useState(false);
  const [geoFields, setGeoFields] = useState<DataViewField[]>([]);
  const [nameFields, setNameFields] = useState<DataViewField[]>([]);

  useEffect(() => {
    if (!props.ruleParams.boundaryIndexId || props.ruleParams.boundaryIndexId === dataView?.id) {
      return;
    }

    let ignore = false;
    setIsLoading(true);
    setDataViewNotFound(false);
    props.data.indexPatterns
      .get(props.ruleParams.boundaryIndexId)
      .then((dataView) => {
        if (!ignore) {
          setDataView(dataView);
          setGeoFields(getGeoFields(dataView.fields));
          setNameFields(getNameFields(dataView.fields));
          setIsLoading(false);
        }
      })
      .catch(() => {
        if (!ignore) {
          setDataViewNotFound(true);
          setIsLoading(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, [props.ruleParams.boundaryIndexId]);

  function getDataViewError() {
    const validationError = props.getValidationError('boundaryIndexTitle');
    if (validationError) {
      return validationError;
    }

    if (dataView && geoFields.length === 0) {
      return i18n.translate('xpack.stackAlerts.geoContainment.noGeoFieldInIndexPattern.message', {
        defaultMessage:
          'Data view does not contain geospatial fields. Must have one of type: {geoFieldTypes}.',
        values: {
          geoFieldTypes: BOUNDARY_GEO_FIELD_TYPES.join(', '),
        },
      });
    }

    if (dataViewNotFound) {
      return i18n.translate('xpack.stackAlerts.geoContainment.dataViewNotFound', {
        defaultMessage: `Unable to find data view '{id}'`,
        values: { id: props.ruleParams.indexId },
      });
    }

    return null;
  }

  const dataViewError = getDataViewError();
  const geoFieldError = props.getValidationError('boundaryGeoField');

  return (
    <EuiPanel>
      <EuiTitle size="xs">
        <h5>
          <FormattedMessage
            id="xpack.stackAlerts.geoContainment.boundariesFormLabel"
            defaultMessage="Boundaries"
          />
        </h5>
      </EuiTitle>

      <EuiSpacer size="m" />

      <EuiSkeletonText lines={3} size="s" isLoading={isLoading}>
        <EuiFormRow
          error={dataViewError}
          isInvalid={Boolean(dataViewError)}
          label={i18n.translate('xpack.stackAlerts.geoContainment.dataViewLabel', {
            defaultMessage: 'Data view',
          })}
        >
          <DataViewSelect
            dataViewId={props.ruleParams.boundaryIndexId}
            data={props.data}
            isInvalid={Boolean(dataViewError)}
            onChange={(dataView: DataView) => {
              props.setDataViewId(dataView.id);
              props.setDataViewTitle(dataView.title);

              const geoFields = getGeoFields(dataView.fields);
              if (geoFields.length) {
                props.setGeoField(geoFields[0].name);
              } else if ('boundaryGeoField' in props.ruleParams) {
                props.setGeoField('');
              }
              
              // do not attempt to auto select name field
              // its optional plus there can be many matches so auto selecting the correct field is improbable
              if ('boundaryNameField' in props.ruleParams) {
                props.setNameField(undefined);
              }
            }}
            unifiedSearch={props.unifiedSearch}
          />
        </EuiFormRow>

        {props.ruleParams.boundaryIndexId && (
          <>
            <EuiFormRow
              error={geoFieldError}
              isInvalid={Boolean(geoFieldError)}
              label={i18n.translate('xpack.stackAlerts.geoContainment.geofieldLabel', {
                defaultMessage: 'Location',
              })}
            >
              <SingleFieldSelect
                isInvalid={Boolean(geoFieldError)}
                placeholder={i18n.translate('xpack.stackAlerts.geoContainment.selectGeoLabel', {
                  defaultMessage: 'Select location field',
                })}
                value={props.ruleParams.boundaryGeoField}
                onChange={(fieldName?: string) => {
                  if (fieldName) {
                    props.setGeoField(fieldName);
                  }
                }}
                fields={geoFields}
              />
            </EuiFormRow>

            <EuiFormRow
              label={i18n.translate('xpack.stackAlerts.geoContainment.boundaryNameSelectLabel', {
                defaultMessage: 'Display name (optional)',
              })}
            >
              <SingleFieldSelect
                placeholder={i18n.translate('xpack.stackAlerts.geoContainment.selectGeoLabel', {
                  defaultMessage: 'Select name field',
                })}
                value={props.ruleParams.boundaryNameField}
                onChange={(fieldName?: string) => {
                  if (fieldName) {
                    props.setNameField(fieldName);
                  }
                }}
                fields={nameFields}
              />
            </EuiFormRow>
          </>
        )}
      </EuiSkeletonText>
    </EuiPanel>
  );
};
