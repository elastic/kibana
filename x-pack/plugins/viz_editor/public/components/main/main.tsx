/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiButtonEmpty,
  EuiPage,
  EuiPageBody,
  EuiPageContent,
  EuiPageContentBody,
  EuiPageSideBar,
} from '@elastic/eui';
import React, { Dispatch, useEffect, useReducer } from 'react';
import * as ds from '../../lib/es_data_source';
import { FieldPanel } from '../field_panel';

const emptyRawData = { cols: [], rows: [] };

interface Props {
  kfetch: (opts: any) => Promise<any>;
}

interface State {
  loading: boolean;
  errorMessage: string;
  dataSource: ds.DataSource;
  query: any;
  rawData: any; // TODO: Properly type this...
}

type Action =
  | { type: 'loaded'; dataSource: ds.DataSource; rawData: any }
  | { type: 'loadError'; message: string }
  | { type: 'setQuery'; query: any; rawData: any };

function initialState(): State {
  return {
    loading: true,
    errorMessage: '',
    dataSource: ds.empty(),
    query: { limit: 50 },
    rawData: emptyRawData,
  };
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'loaded':
      return {
        ...state,
        loading: false,
        dataSource: action.dataSource,
        rawData: action.rawData,
      };
    case 'loadError':
      return {
        ...state,
        loading: false,
        errorMessage: action.message,
      };
    case 'setQuery':
      return {
        ...state,
        query: action.query,
        rawData: action.rawData,
      };
    default:
      throw new Error(`Unknown action ${(action as any).type}`);
  }
}

async function fetchInitialState(kfetch: any, dispatch: Dispatch<Action>) {
  const dataSource = await ds.load({ kfetch });
  let rawData: any = emptyRawData;

  if (dataSource.fields.length) {
    rawData = await dataSource.query({ limit: 50 });
    rawData.columns = rawData.columns.sort((a: any, b: any) => a.name.localeCompare(b.name));
  }

  dispatch({
    type: 'loaded',
    dataSource,
    rawData,
  });
}

function generateQuery(field: ds.DataSourceField) {
  switch (field.type) {
    case 'string':
      return {
        select: [{ op: 'col', arg: field.name }, { op: 'count' }],
      };
    case 'number':
      return {
        select: [{ op: 'avg', arg: { op: 'col', arg: field.name } }],
      };
    default:
      return { limit: 50 };
  }
}

async function setGeneratedQuery(
  dispatch: React.Dispatch<Action>,
  dataSource: ds.DataSource,
  field: ds.DataSourceField
) {
  const query = generateQuery(field);
  const rawData = await dataSource.query(query);

  dispatch({
    type: 'setQuery',
    query,
    rawData,
  });
}

export function Main({ kfetch }: Props) {
  const [state, dispatch] = useReducer(reducer, initialState());
  const { dataSource, loading, rawData } = state;

  useEffect(() => {
    fetchInitialState(kfetch, dispatch);
  }, []);

  if (loading) {
    return <h1>Loading...</h1>;
  }

  return (
    <EuiPage>
      <EuiPageSideBar>
        <EuiButtonEmpty className="vzDataSource-link" size="l">
          {dataSource.name}
        </EuiButtonEmpty>
        <FieldPanel
          fields={dataSource.fields}
          generateQuery={(field: any) => setGeneratedQuery(dispatch, dataSource, field)}
        />
      </EuiPageSideBar>
      <EuiPageBody className="vzBody">
        <EuiPageContent>
          <EuiPageContentBody className="vzTableContainer">
            <DataTable {...rawData} />
          </EuiPageContentBody>
        </EuiPageContent>
      </EuiPageBody>
    </EuiPage>
  );
}

function DataTable({ rows, columns }: any) {
  return (
    <table>
      <thead>
        <tr>
          {columns.map(({ name }: any) => (
            <th className="vzTableCell" key={name}>
              <span className="vzTableCell-content">{name}</span>
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row: any) => (
          <tr key={row._id}>
            {columns.map(({ name }: any, i: number) => (
              <td key={name} className="vzTableCell">
                <span className="vzTableCell-content">{row[name]}</span>
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
