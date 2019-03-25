/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, useEffect, useState } from 'react';

import { StaticIndexPattern } from 'ui/index_patterns';

import { EuiInMemoryTable, EuiProgress } from '@elastic/eui';

import { ml } from '../../../services/ml_api_service';

import { DataFramePreviewRequest, SimpleQuery } from './type_definitions';

interface Props {
  aggs: any[];
  indexPattern: StaticIndexPattern;
  groupBy: string[];
  query: SimpleQuery['query'];
}

export const DataFrameNewPivotPreview: React.SFC<Props> = ({
  aggs,
  indexPattern,
  groupBy,
  query,
}) => {
  const [loading, setLoading] = useState(false);
  const [dataFramePreviewData, setDataFramePreviewData] = useState([]);

  useEffect(
    () => {
      if (aggs.length === 0) {
        setDataFramePreviewData([]);
        return;
      }

      setLoading(true);

      const request: DataFramePreviewRequest = {
        source: indexPattern.title,
        pivot: {
          group_by: {},
          aggregations: {},
        },
        query,
      };

      groupBy.forEach(g => {
        request.pivot.group_by[g] = {
          terms: {
            field: g,
          },
        };
      });

      aggs.forEach(agg => {
        request.pivot.aggregations[agg.formRowLabel] = {
          [agg.agg]: {
            field: agg.field,
          },
        };
      });

      ml.dataFrame
        .getDataFrameTransformsPreview(request)
        .then((resp: any) => {
          setDataFramePreviewData(resp.preview);
          setLoading(false);
        })
        .catch((resp: any) => {
          setDataFramePreviewData([]);
          setLoading(false);
        });
    },
    [aggs, indexPattern]
  );

  if (dataFramePreviewData.length === 0) {
    return null;
  }

  const columnKeys = Object.keys(dataFramePreviewData[0]);
  columnKeys.sort((a, b) => {
    // make sure groupBy fields are always most left columns
    if (groupBy.some(d => d === a) && groupBy.some(d => d === b)) {
      return a.localeCompare(b);
    }
    if (groupBy.some(d => d === a)) {
      return -1;
    }
    if (groupBy.some(d => d === b)) {
      return 1;
    }
    return a.localeCompare(b);
  });

  const columns = columnKeys.map(k => {
    return {
      field: k,
      name: k,
      sortable: true,
      truncateText: true,
    };
  });

  return (
    <Fragment>
      <h3>Data Frame Pivot Preview</h3>
      {loading && <EuiProgress size="xs" color="accent" />}
      {!loading && <EuiProgress size="xs" color="accent" max={1} value={0} />}
      <EuiInMemoryTable
        condensed="true"
        items={dataFramePreviewData}
        columns={columns}
        pagination={true}
      />
    </Fragment>
  );
};
