/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, useEffect, useState } from 'react';

import { SearchResponse } from 'elasticsearch';

import { StaticIndexPattern } from 'ui/index_patterns';

import { EuiButtonEmpty, EuiEmptyPrompt, EuiInMemoryTable, EuiProgress } from '@elastic/eui';

import { ml } from '../../../services/ml_api_service';

import { SimpleQuery } from './type_definitions';

interface Props {
  indexPattern: StaticIndexPattern;
  query: SimpleQuery;
  cellClick(search: string): void;
}

const SEARCH_SIZE = 1000;

export const DataFrameSourceIndexPreview: React.SFC<Props> = ({
  cellClick,
  indexPattern,
  query,
}) => {
  const [loading, setLoading] = useState(false);
  const [tableData, setTableData] = useState([]);

  useEffect(
    () => {
      setLoading(true);

      ml.esSearch({
        index: indexPattern.title,
        rest_total_hits_as_int: true,
        size: SEARCH_SIZE,
        body: query,
      })
        .then((resp: SearchResponse<any>) => {
          const docs = resp.hits.hits.map(d => d._source);
          setTableData(docs as []);
          setLoading(false);
        })
        .catch((resp: any) => {
          setTableData([]);
          setLoading(false);
        });
    },
    [indexPattern, query]
  );

  if (tableData.length === 0) {
    return (
      <EuiEmptyPrompt title={<h2>No results</h2>} body={<p>Check the syntax of your query.</p>} />
    );
  }

  const columnKeys = Object.keys(tableData[0]);
  columnKeys.sort();
  const columns = columnKeys
    .filter(k => {
      let value = false;
      tableData.forEach(row => {
        if (row[k] !== null) {
          value = true;
        }
      });
      return value;
    })
    .map(k => {
      return {
        field: k,
        name: k,
        sortable: true,
        truncateText: true,
        render: (d: string) => (
          <EuiButtonEmpty size="xs" onClick={() => cellClick(`${k}:(${d})`)}>
            {d}
          </EuiButtonEmpty>
        ),
      };
    });

  return (
    <Fragment>
      <h3>Source Index {indexPattern.title}</h3>
      {loading && <EuiProgress size="xs" color="accent" />}
      {!loading && <EuiProgress size="xs" color="accent" max={1} value={0} />}
      <EuiInMemoryTable
        className="mlDataFrameTable"
        condensed="true"
        items={tableData}
        columns={columns}
        pagination={true}
        responsive={true}
        hasActions={false}
        isExpandable={false}
        isSelectable={false}
      />
    </Fragment>
  );
};
