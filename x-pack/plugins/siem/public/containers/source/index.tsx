/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { isUndefined } from 'lodash';
import { get, memoize, pick, set, difference } from 'lodash/fp';
import React from 'react';
import { Query } from 'react-apollo';
import { StaticIndexPattern, StaticIndexPatternField } from 'ui/index_patterns';

import { IndexField, IndexType, SourceQuery } from '../../graphql/types';

import { sourceQuery } from './index.gql_query';

export interface BrowserField {
  aggregatable: boolean;
  category: string;
  description: string | null;
  example: string | number | null;
  indexes: string[];
  name: string;
  searchable: boolean;
  type: string;
  fields: Readonly<Record<string, Partial<BrowserField>>>;
}

export type BrowserFields = Readonly<Record<string, Partial<BrowserField>>>;

interface WithSourceArgs {
  auditbeatIndicesExist: boolean;
  browserFields: BrowserFields;
  filebeatIndicesExist: boolean;
  winlogbeatIndicesExist: boolean;
  indexPattern: StaticIndexPattern;
}

interface WithSourceProps {
  children: (args: WithSourceArgs) => React.ReactNode;
  indexTypes: IndexType[];
  sourceId: string;
}

export class WithSource extends React.PureComponent<WithSourceProps> {
  private memoizedIndexFields: (
    indexTypes: string[],
    fields: IndexField[]
  ) => StaticIndexPatternField[];
  private memoizedBrowserFields: (indexTypes: string[], fields: IndexField[]) => BrowserFields;

  constructor(props: WithSourceProps) {
    super(props);
    this.memoizedIndexFields = memoize(this.getIndexFields);
    this.memoizedBrowserFields = memoize(this.getBrowserFields);
  }

  public render() {
    const { children, sourceId, indexTypes = [IndexType.ANY] } = this.props;
    return (
      <Query<SourceQuery.Query, SourceQuery.Variables>
        query={sourceQuery}
        fetchPolicy="cache-first"
        notifyOnNetworkStatusChange
        variables={{ sourceId, indexTypes: [IndexType.ANY] }}
      >
        {({ data }) => {
          const logAlias = get('source.configuration.logAlias', data);
          const auditbeatAlias = get('source.configuration.auditbeatAlias', data);
          const packetbeatAlias = get('source.configuration.packetbeatAlias', data);
          const winlogbeatAlias = get('source.configuration.winlogbeatAlias', data);
          let indexPatternTitle: string[] = [];
          if (indexTypes.includes(IndexType.ANY)) {
            indexPatternTitle = [
              ...indexPatternTitle,
              logAlias,
              auditbeatAlias,
              packetbeatAlias,
              winlogbeatAlias,
            ];
          } else {
            if (indexTypes.includes(IndexType.AUDITBEAT)) {
              indexPatternTitle = [...indexPatternTitle, auditbeatAlias];
            }
            if (indexTypes.includes(IndexType.FILEBEAT)) {
              indexPatternTitle = [...indexPatternTitle, logAlias];
            }
            if (indexTypes.includes(IndexType.PACKETBEAT)) {
              indexPatternTitle = [...indexPatternTitle, packetbeatAlias];
            }
            if (indexTypes.includes(IndexType.WINLOGBEAT)) {
              indexPatternTitle = [...indexPatternTitle, winlogbeatAlias];
            }
          }
          const indexTypesLowerCase = indexTypes.map(i => i.toLocaleLowerCase());
          return children({
            auditbeatIndicesExist: get('source.status.auditbeatIndicesExist', data),
            filebeatIndicesExist: get('source.status.filebeatIndicesExist', data),
            winlogbeatIndicesExist: get('source.status.winlogbeatIndicesExist', data),
            browserFields: get('source.status.indexFields', data)
              ? this.memoizedBrowserFields(
                  indexTypesLowerCase,
                  get('source.status.indexFields', data)
                )
              : {},
            indexPattern: {
              fields: get('source.status.indexFields', data)
                ? this.memoizedIndexFields(
                    indexTypesLowerCase,
                    get('source.status.indexFields', data)
                  )
                : [],
              title: indexPatternTitle.join(),
            },
          });
        }}
      </Query>
    );
  }

  private getIndexFields = (
    indexTypes: string[],
    fields: IndexField[]
  ): StaticIndexPatternField[] =>
    fields
      .filter(
        item =>
          indexTypes.includes('any') ||
          difference(item.indexes, indexTypes).length !== item.indexes.length
      )
      .map(field => pick(['name', 'searchable', 'type', 'aggregatable'], field));

  private getBrowserFields = (indexTypes: string[], fields: IndexField[]): BrowserFields =>
    fields
      .filter(
        item =>
          indexTypes.includes('any') ||
          difference(item.indexes, indexTypes).length !== item.indexes.length
      )
      .reduce(
        (accumulator: BrowserFields, field: IndexField) =>
          set([field.category, 'fields', field.name], field, accumulator),
        {} as BrowserFields
      );
}

export const indicesExistOrDataTemporarilyUnavailable = (indicesExist: boolean | undefined) =>
  indicesExist || isUndefined(indicesExist);
