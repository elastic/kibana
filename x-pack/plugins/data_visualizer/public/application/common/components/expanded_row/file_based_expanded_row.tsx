/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  BooleanContent,
  DateContent,
  IpContent,
  KeywordContent,
  OtherContent,
  TextContent,
  NumberContent,
} from '../stats_table/components/field_data_expanded_row';
import { GeoPointContent } from './geo_point_content/geo_point_content';
import { JOB_FIELD_TYPES } from '../../../../../common/constants';
import type { FileBasedFieldVisConfig } from '../../../../../common/types/field_vis_config';

export const FileBasedDataVisualizerExpandedRow = ({ item }: { item: FileBasedFieldVisConfig }) => {
  const config = item;
  const { type, fieldName } = config;

  function getCardContent() {
    switch (type) {
      case JOB_FIELD_TYPES.NUMBER:
        return <NumberContent config={config} />;

      case JOB_FIELD_TYPES.BOOLEAN:
        return <BooleanContent config={config} />;

      case JOB_FIELD_TYPES.DATE:
        return <DateContent config={config} />;

      case JOB_FIELD_TYPES.GEO_POINT:
        return <GeoPointContent config={config} />;

      case JOB_FIELD_TYPES.IP:
        return <IpContent config={config} />;

      case JOB_FIELD_TYPES.KEYWORD:
        return <KeywordContent config={config} />;

      case JOB_FIELD_TYPES.TEXT:
        return <TextContent config={config} />;

      default:
        return <OtherContent config={config} />;
    }
  }

  return (
    <div className="dvExpandedRow" data-test-subj={`dataVisualizerFieldExpandedRow-${fieldName}`}>
      {getCardContent()}
    </div>
  );
};
