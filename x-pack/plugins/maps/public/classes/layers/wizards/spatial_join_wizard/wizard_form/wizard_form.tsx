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
  const [isDistanceInvalid, setIsDistanceInvalid] = useState(false);
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
    return !isDistanceInvalid;
  }

  function isRightConfigComplete() {
    return rightDataView !== undefined && rightGeoField !== undefined;
  }

  function getDistanceAsNumber() {
    return typeof distance === 'string' ? parseFloat(distance as string) : distance;
  }

  useEffect(() => {
    const distanceAsNumber = getDistanceAsNumber();
    if (isNaN(distanceAsNumber)) {
      setIsDistanceInvalid(true);
      return;
    }

    if (distanceAsNumber <= 0) {
      setIsDistanceInvalid(true);
      return;
    }

    setIsDistanceInvalid(false);
  }, [distance, setIsDistanceInvalid]);

  useEffect(() => {
    if (!isLeftConfigComplete() || !isRelationshipConfigComplete() || !isRightConfigComplete()) {
      previewLayers([]);
      return;
    }

    const layerDescriptor = createDistanceJoinLayerDescriptor({
      distance: getDistanceAsNumber(),
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
          isDistanceInvalid={isDistanceInvalid}
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