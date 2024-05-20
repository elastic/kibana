/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import { EuiCallOut, EuiFormRow, EuiPopoverTitle, EuiSkeletonText, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { DataView, DataViewField } from '@kbn/data-plugin/common';
import type {
  ESDistanceSourceDescriptor,
  JoinSourceDescriptor,
} from '../../../../../../common/descriptor_types';
import { getIndexPatternService } from '../../../../../kibana_services';
import { getGeoFields } from '../../../../../index_pattern_util';
import { GeoIndexPatternSelect } from '../../../../../components/geo_index_pattern_select';
import { GeoFieldSelect } from '../../../../../components/geo_field_select';
import { inputStrings } from '../../../../input_strings';
import { RelationshipExpression } from '../../../../../classes/layers/wizards/spatial_join_wizard';
import { DEFAULT_WITHIN_DISTANCE } from '../../../../../classes/sources/join_sources';

interface Props {
  sourceDescriptor: Partial<ESDistanceSourceDescriptor>;
  onSourceDescriptorChange: (sourceDescriptor: Partial<JoinSourceDescriptor>) => void;
}

export function SpatialJoinPopoverContent(props: Props) {
  const [rightDataView, setRightDataView] = useState<DataView | undefined>(undefined);
  const [rightGeoFields, setRightGeoFields] = useState<DataViewField[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [unableToLoadDataView, setUnableToLoadDataView] = useState<boolean>(false);

  useEffect(() => {
    if (props.sourceDescriptor.indexPatternId === undefined) {
      return;
    }

    let ignore = false;
    setIsLoading(true);
    getIndexPatternService()
      .get(props.sourceDescriptor.indexPatternId)
      .then((dataView) => {
        if (!ignore) {
          setIsLoading(false);
          setRightDataView(dataView);
          setRightGeoFields(getGeoFields(dataView.fields));
        }
      })
      .catch((err) => {
        if (!ignore) {
          setIsLoading(false);
          setUnableToLoadDataView(true);
        }
      });

    return () => {
      ignore = true;
    };
    // only run on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const dataViewCallout = unableToLoadDataView ? (
    <>
      <EuiCallOut color="warning">
        <p>
          {i18n.translate('xpack.maps.spatialJoinExpression.noDataViewTitle', {
            defaultMessage: 'Unable to load data view {dataViewId}.',
            values: { dataViewId: props.sourceDescriptor.indexPatternId },
          })}
        </p>
      </EuiCallOut>
      <EuiSpacer size="s" />
    </>
  ) : null;

  const geoFieldSelect = rightDataView ? (
    <GeoFieldSelect
      value={props.sourceDescriptor.geoField ? props.sourceDescriptor.geoField : ''}
      onChange={(geoField?: string) => {
        if (!geoField) {
          return;
        }
        props.onSourceDescriptorChange({
          ...props.sourceDescriptor,
          geoField,
        });
      }}
      geoFields={rightGeoFields}
      isClearable={false}
    />
  ) : null;

  return (
    <div style={{ width: 300 }}>
      <EuiPopoverTitle>
        {i18n.translate('xpack.maps.spatialJoinExpression.popoverTitle', {
          defaultMessage: 'Configure spatial join',
        })}
      </EuiPopoverTitle>

      <EuiSkeletonText lines={3} isLoading={isLoading}>
        <EuiFormRow label={inputStrings.relationshipLabel}>
          <RelationshipExpression
            distance={
              typeof props.sourceDescriptor.distance === 'number'
                ? props.sourceDescriptor.distance
                : DEFAULT_WITHIN_DISTANCE
            }
            onDistanceChange={(distance: number) => {
              props.onSourceDescriptorChange({
                ...props.sourceDescriptor,
                distance,
              });
            }}
          />
        </EuiFormRow>

        {dataViewCallout}

        <GeoIndexPatternSelect
          dataView={rightDataView}
          onChange={(dataView: DataView) => {
            setUnableToLoadDataView(false);
            setRightDataView(dataView);
            const geoFields = getGeoFields(dataView.fields);
            setRightGeoFields(geoFields);
            props.onSourceDescriptorChange({
              ...props.sourceDescriptor,
              indexPatternId: dataView.id,
              geoField: geoFields.length ? geoFields[0].name : undefined,
            });
          }}
        />

        {geoFieldSelect}
      </EuiSkeletonText>
    </div>
  );
}
