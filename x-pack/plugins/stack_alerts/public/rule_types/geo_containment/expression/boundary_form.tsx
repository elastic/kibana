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
    if (!props.ruleParams.boundaryIndexId) {
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
          label={i18n.translate('xpack.stackAlerts.geoContainment.dataViewLabel', {
            defaultMessage: 'Data view',
          })}
        >
          <DataViewSelect
            dataViewId={props.ruleParams.boundaryIndexId}
            data={props.data}
            isInvalid={false}
            onChange={(dataView: DataView) => {
              props.setDataViewId(dataView.id);
              props.setDataViewTitle(dataView.title);
              const geoFields = getGeoFields(dataView.fields);
              props.setGeoField(geoFields.length ? geoFields[0].name : '');
              // do not attempt to auto select name field
              // its optional plus there can be many matches so auto selecting the correct field is improbable
              props.setNameField(undefined);
            }}
            unifiedSearch={props.unifiedSearch}
          />
        </EuiFormRow>

        {props.ruleParams.boundaryIndexId && (
          <>
            <EuiFormRow
              label={i18n.translate('xpack.stackAlerts.geoContainment.geofieldLabel', {
                defaultMessage: 'Location',
              })}
            >
              <SingleFieldSelect
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
