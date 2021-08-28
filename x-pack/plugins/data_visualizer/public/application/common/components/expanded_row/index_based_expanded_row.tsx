/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { IndexPattern } from '../../../../../../../../src/plugins/data/common/index_patterns/index_patterns/index_pattern';
import { JOB_FIELD_TYPES } from '../../../../../common/constants';
import type { CombinedQuery } from '../../../index_data_visualizer/types/combined_query';
import { LoadingIndicator } from '../loading_indicator/loading_indicator';
import { NotInDocsContent } from '../not_in_docs_content/not_in_docs_context';
import { BooleanContent } from '../stats_table/components/field_data_expanded_row/boolean_content';
import { DateContent } from '../stats_table/components/field_data_expanded_row/date_content';
import { IpContent } from '../stats_table/components/field_data_expanded_row/ip_content';
import { KeywordContent } from '../stats_table/components/field_data_expanded_row/keyword_content';
import { NumberContent } from '../stats_table/components/field_data_expanded_row/number_content';
import { OtherContent } from '../stats_table/components/field_data_expanded_row/other_content';
import { TextContent } from '../stats_table/components/field_data_expanded_row/text_content';
import type { FieldVisConfig } from '../stats_table/types/field_vis_config';
import { GeoPointContentWithMap } from './geo_point_content_with_map/geo_point_content_with_map';

export const IndexBasedDataVisualizerExpandedRow = ({
  item,
  indexPattern,
  combinedQuery,
}: {
  item: FieldVisConfig;
  indexPattern: IndexPattern | undefined;
  combinedQuery: CombinedQuery;
}) => {
  const config = item;
  const { loading, type, existsInDocs, fieldName } = config;

  function getCardContent() {
    if (existsInDocs === false) {
      return <NotInDocsContent />;
    }

    switch (type) {
      case JOB_FIELD_TYPES.NUMBER:
        return <NumberContent config={config} />;

      case JOB_FIELD_TYPES.BOOLEAN:
        return <BooleanContent config={config} />;

      case JOB_FIELD_TYPES.DATE:
        return <DateContent config={config} />;

      case JOB_FIELD_TYPES.GEO_POINT:
      case JOB_FIELD_TYPES.GEO_SHAPE:
        return (
          <GeoPointContentWithMap
            config={config}
            indexPattern={indexPattern}
            combinedQuery={combinedQuery}
          />
        );

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
    <div
      className="dataVisualizerFieldExpandedRow"
      data-test-subj={`dataVisualizerFieldExpandedRow-${fieldName}`}
    >
      {loading === true ? <LoadingIndicator /> : getCardContent()}
    </div>
  );
};
