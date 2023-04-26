/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import type { DataViewField, DataView } from '@kbn/data-plugin/common';
import { getGeoPointFields } from '../../../../../index_pattern_util';
import { LeftSourcePanel } from './left_source_panel';

export function WizardForm() {
  const [leftDataView, setLeftDataView] = useState<DataView | undefined>();
  const [leftGeoFields, setLeftGeoFields] = useState<DataViewField[]>([]);
  const [leftGeoField, setLeftGeoField] = useState<DataViewField | undefined>();

  return (
    <LeftSourcePanel
      dataView={leftDataView}
      onDataViewSelect={(dataView: DataView) => {
        setLeftDataView(dataView);
        const leftGeoFields = getGeoPointFields(dataView.fields);
        setLeftGeoFields(leftGeoFields);
        setLeftGeoField(leftGeoFields.length ? leftGeoFields[0] : undefined);
      }}
    />
  )
}