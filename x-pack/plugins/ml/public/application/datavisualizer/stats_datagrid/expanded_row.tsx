/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { FieldVisConfig } from '../index_based/common';
import {
  BooleanContent,
  DateContent,
  GeoPointContent,
  IpContent,
  KeywordContent,
  NotInDocsContent,
  OtherContent,
  TextContent,
} from '../index_based/components/field_data_card/content_types';
import { NumberContent } from './components/field_data_expanded_row/number_content';
import { ML_JOB_FIELD_TYPES } from '../../../../common/constants/field_types';
import { LoadingIndicator } from '../index_based/components/field_data_card/loading_indicator';

export const DataVisualizerFieldExpandedRow = ({ item }: { item: FieldVisConfig }) => {
  const config = item;
  const { loading, type, existsInDocs } = config;

  function getCardContent() {
    if (existsInDocs === false) {
      return <NotInDocsContent />;
    }

    switch (type) {
      case ML_JOB_FIELD_TYPES.NUMBER:
        return <NumberContent config={config} />;

      case ML_JOB_FIELD_TYPES.BOOLEAN:
        return <BooleanContent config={config} />;

      case ML_JOB_FIELD_TYPES.DATE:
        return <DateContent config={config} />;

      case ML_JOB_FIELD_TYPES.GEO_POINT:
        return <GeoPointContent config={config} />;

      case ML_JOB_FIELD_TYPES.IP:
        return <IpContent config={config} />;

      case ML_JOB_FIELD_TYPES.KEYWORD:
        return <KeywordContent config={config} />;

      case ML_JOB_FIELD_TYPES.TEXT:
        return <TextContent config={config} />;

      default:
        return <OtherContent config={config} />;
    }
  }

  return (
    <div style={{ width: '100%' }}>
      <div className="mlFieldDataCard__content" data-test-subj="mlFieldDataCardContent">
        {loading === true ? <LoadingIndicator /> : getCardContent()}
      </div>
    </div>
  );
};
