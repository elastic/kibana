/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import { EuiSpacer } from '@elastic/eui';
import type { DataViewField, DataView } from '@kbn/data-plugin/common';
import { getGeoFields, getGeoPointFields } from '../../../../../index_pattern_util';
import { RenderWizardArguments } from '../../layer_wizard_registry';
import { LeftSourcePanel } from './left_source_panel';
import { RelationshipPanel } from './relationship_panel';
import { RightSourcePanel } from './right_source_panel';
import { createDistanceJoinLayerDescriptor } from './create_spatial_join_layer_descriptor';

export function WizardForm({ previewLayers }: RenderWizardArguments) {
  const [distance, setDistance] = useState<number | string>(5);
  const [leftDataView, setLeftDataView] = useState<DataView | undefined>();
  const [leftGeoFields, setLeftGeoFields] = useState<DataViewField[]>([]);
  const [leftGeoField, setLeftGeoField] = useState<string | undefined>();
  const [rightDataView, setRightDataView] = useState<DataView | undefined>();
  const [rightGeoFields, setRightGeoFields] = useState<DataViewField[]>([]);
  const [rightGeoField, setRightGeoField] = useState<string | undefined>();

  function isLeftConfigComplete() {
    return leftDataView !== undefined && leftGeoField !== undefined;
  }

  function isRelationshipConfigComplete() {
    const distanceAsNumber = typeof distance === 'string' ? parseFloat(distance as string) : distance;
    return !isNaN(distanceAsNumber);
  }

  function isRightConfigComplete() {
    return rightDataView !== undefined && rightGeoField !== undefined;
  }

  useEffect(() => {
    if (!isLeftConfigComplete() || !isRelationshipConfigComplete() || !isRightConfigComplete()) {
      previewLayers([]);
      return;
    }

    const layerDescriptor = createDistanceJoinLayerDescriptor({
      distance: typeof distance === 'string' ? parseFloat(distance as string) : distance,
      leftDataViewId: leftDataView!.id,
      leftGeoField: leftGeoField!,
      rightDataViewId: rightDataView!.id,
      rightGeoField: rightGeoField!,
    });

    previewLayers([layerDescriptor]);
  }, [distance, leftDataView, leftGeoField, rightDataView, rightGeoField]);

  const relationshipPanel = isLeftConfigComplete()
    ? <>
        <EuiSpacer size="s" />
        <RelationshipPanel
          distance={distance}
          onDistanceChange={setDistance}
        />
      </>
    : null;

  const rightSourcePanel = isLeftConfigComplete()
    ? <>
        <EuiSpacer size="s" />
        <RightSourcePanel
          dataView={rightDataView}
          geoField={rightGeoField}
          geoFields={rightGeoFields}
          onDataViewSelect={(dataView: DataView) => {
            setRightDataView(dataView);
            const geoFields = getGeoFields(dataView.fields);
            setRightGeoFields(geoFields);
            setRightGeoField(geoFields.length ? geoFields[0].name : undefined);
          }}
          onGeoFieldSelect={setRightGeoField}
        />
      </>
    : null;

  return (
    <>
      <LeftSourcePanel
        dataView={leftDataView}
        geoField={leftGeoField}
        geoFields={leftGeoFields}
        onDataViewSelect={(dataView: DataView) => {
          setLeftDataView(dataView);
          const geoFields = getGeoPointFields(dataView.fields);
          setLeftGeoFields(geoFields);
          setLeftGeoField(geoFields.length ? geoFields[0].name : undefined);
        }}
        onGeoFieldSelect={setLeftGeoField}
      />

      {relationshipPanel}

      {rightSourcePanel}
    </>
  );
}