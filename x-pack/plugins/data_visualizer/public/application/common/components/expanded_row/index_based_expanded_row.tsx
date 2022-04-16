/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { DataView, DataViewField } from '@kbn/data-views-plugin/public';
import { GeoPointContentWithMap } from './geo_point_content_with_map';
import { JOB_FIELD_TYPES } from '../../../../../common/constants';
import {
  BooleanContent,
  DateContent,
  IpContent,
  KeywordContent,
  NumberContent,
  OtherContent,
  TextContent,
} from '../stats_table/components/field_data_expanded_row';
import { NotInDocsContent } from '../not_in_docs_content';
import { FieldVisConfig } from '../stats_table/types';
import { CombinedQuery } from '../../../index_data_visualizer/types/combined_query';
import { LoadingIndicator } from '../loading_indicator';
import { ErrorMessageContent } from '../stats_table/components/field_data_expanded_row/error_message';

export const IndexBasedDataVisualizerExpandedRow = ({
  item,
  dataView,
  combinedQuery,
  onAddFilter,
}: {
  item: FieldVisConfig;
  dataView: DataView | undefined;
  combinedQuery: CombinedQuery;
  /**
   * Callback to add a filter to filter bar
   */
  onAddFilter?: (field: DataViewField | string, value: string, type: '+' | '-') => void;
}) => {
  const config = item;
  const { loading, type, existsInDocs, fieldName } = config;

  function getCardContent() {
    if (existsInDocs === false) {
      return <NotInDocsContent />;
    }

    if (config.stats?.error) {
      return <ErrorMessageContent fieldName={fieldName} error={config.stats?.error} />;
    }

    switch (type) {
      case JOB_FIELD_TYPES.NUMBER:
        return <NumberContent config={config} onAddFilter={onAddFilter} />;

      case JOB_FIELD_TYPES.BOOLEAN:
        return <BooleanContent config={config} />;

      case JOB_FIELD_TYPES.DATE:
        return <DateContent config={config} />;

      case JOB_FIELD_TYPES.GEO_POINT:
      case JOB_FIELD_TYPES.GEO_SHAPE:
        return (
          <GeoPointContentWithMap
            config={config}
            dataView={dataView}
            combinedQuery={combinedQuery}
          />
        );

      case JOB_FIELD_TYPES.IP:
        return <IpContent config={config} onAddFilter={onAddFilter} />;

      case JOB_FIELD_TYPES.KEYWORD:
        return <KeywordContent config={config} onAddFilter={onAddFilter} />;

      case JOB_FIELD_TYPES.TEXT:
        return <TextContent config={config} />;

      default:
        return <OtherContent config={config} />;
    }
  }

  return (
    <div className="dvExpandedRow" data-test-subj={`dataVisualizerFieldExpandedRow-${fieldName}`}>
      {loading === true ? <LoadingIndicator /> : getCardContent()}
    </div>
  );
};
