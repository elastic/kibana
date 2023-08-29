/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiFormRow,
  EuiPanel,
  EuiSkeletonText,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { UnifiedSearchPublicPluginStart } from '@kbn/unified-search-plugin/public';
import { DataViewSelect } from './data_view_select';
import { SingleFieldSelect } from './single_field_select';

export const ENTITY_GEO_FIELD_TYPES = ['geo_point', 'geo_shape'];

function getDateFields(fields: DataViewField[]) {
  return fields.filter((field: DataViewField) => field.type === 'date');
}

function getEntityFields(fields: DataViewField[]) {
  return fields.filter((field: DataViewField) => 
    field.aggregatable && ['string', 'number', 'ip'].includes(field.type) && !field.name.startsWith('_'));
}

function getGeoFields(fields: DataViewField[]) {
  return fields.filter((field: DataViewField) =>
    ENTITY_GEO_FIELD_TYPES.includes(field.type)
  );
}

interface Props {
  data: DataPublicPluginStart;
  ruleParams: GeoContainmentAlertParams;
  setDataViewId: (id: string) => void;
  setDataViewTitle: (title: string) => void;
  setDateField: (fieldName: string) => void;
  setEntityField: (fieldName: string) => void;
  setGeoField: (fieldName: string) => void;
  unifiedSearch: UnifiedSearchPublicPluginStart;
}

export const EntityForm = (props: Props) => {
  const [isLoading, setIsLoading] = useState(false);
  const [dataView, setDataView] = useState<undefined | DataView>();
  const [dataViewNotFound, setDataViewNotFound] = useState(false);
  const [dateFields, setDateFields] = useState<DataViewField[]>([]);
  const [entityFields, setEntityFields] = useState<DataViewField[]>([]);
  const [geoFields, setGeoFields] = useState<DataViewField[]>([]);

  useEffect(() => {
    if (!props.ruleParams.indexId) {
      return;
    }

    let ignore = false;
    setIsLoading(true);
    setDataViewNotFound(false);
    props.data.indexPatterns.get(props.ruleParams.indexId)
      .then((dataView) => {
        if (!ignore) {
          setDataView(dataView);
          setDateFields(getDateFields(dataView.fields));
          setEntityFields(getEntityFields(dataView.fields));
          setGeoFields(getGeoFields(dataView.fields));
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
  }, [props.ruleParams.indexId]);

  return (
    <EuiPanel>
      <EuiTitle size="xs">
        <h5>
          <FormattedMessage
            id="xpack.stackAlerts.geoContainment.entitiesFormLabel"
            defaultMessage="Entities"
          />
        </h5>
      </EuiTitle>

      <EuiSpacer size="s" />

      <EuiSkeletonText lines={3} size="s" isLoading={isLoading}>
        <EuiFormRow
          label={i18n.translate('xpack.stackAlerts.geoContainment.dataViewLabel', {
            defaultMessage: 'Data view',
          })}
        >
          <DataViewSelect
            dataViewId={props.ruleParams.indexId}
            data={props.data}
            isInvalid={false}
            onChange={(dataView: DataView) => {
              props.setDataViewId(dataView.id);
              props.setDataViewTitle(dataView.title);
              const dateFields = getDateFields(dataView.fields);
              props.setDateField(dateFields.length ? dateFields[0].name : '');
              // do not attempt to auto select entity field
              // there can be many matches so auto selecting the correct field is improbable
              props.setEntityField('');
              const geoFields = getGeoFields(dataView.fields);
              props.setGeoField(geoFields.length ? geoFields[0].name : '');
            }}
            unifiedSearch={props.unifiedSearch}
          />
        </EuiFormRow>

        {props.ruleParams.indexId && 
          <>
            <EuiFormRow
              label={
                i18n.translate('xpack.stackAlerts.geoContainment.timeFieldLabel', {
                  defaultMessage: 'Time',
                })
              }
            >
              <SingleFieldSelect
                placeholder={i18n.translate('xpack.stackAlerts.geoContainment.selectTimeLabel', {
                  defaultMessage: 'Select time field',
                })}
                value={props.ruleParams.dateField}
                onChange={(fieldName?: string) => {
                  if (fieldName) {
                    props.setDateField(fieldName);
                  }
                }}
                fields={dateFields}
              />
            </EuiFormRow>

            <EuiFormRow
              label={i18n.translate('xpack.stackAlerts.geoContainment.geofieldLabel', {
                defaultMessage: 'Location',
              })}
            >
              <SingleFieldSelect
                placeholder={i18n.translate('xpack.stackAlerts.geoContainment.selectGeoLabel', {
                  defaultMessage: 'Select location field',
                })}
                value={props.ruleParams.geoField}
                onChange={(fieldName?: string) => {
                  if (fieldName) {
                    props.setGeoField(fieldName);
                  }
                }}
                fields={geoFields}
              />
            </EuiFormRow>

            <EuiFormRow
              label={i18n.translate('xpack.stackAlerts.geoContainment.entityfieldLabel', {
                defaultMessage: 'Entity',
              })}
            >
              <SingleFieldSelect
                placeholder={i18n.translate(
                  'xpack.stackAlerts.geoContainment.topHitsSplitFieldSelectPlaceholder',
                  {
                    defaultMessage: 'Select entity field',
                  }
                )}
                value={props.ruleParams.entity}
                onChange={(fieldName?: string) => {
                  if (fieldName) {
                    props.setEntityField(fieldName);
                  }
                }}
                fields={entityFields}
              />
            </EuiFormRow>
          </>
        }
      </EuiSkeletonText>
    </EuiPanel>
  );
}