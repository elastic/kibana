/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { isUndefined } from 'lodash';
import { get, memoize, pick, set } from 'lodash/fp';
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
  indexPattern: StaticIndexPattern;
}

interface WithSourceProps {
  children: (args: WithSourceArgs) => React.ReactNode;
  indexTypes: IndexType[];
  sourceId: string;
}

export class WithSource extends React.PureComponent<WithSourceProps> {
  private memoizedIndexFields: (title: string, fields: IndexField[]) => StaticIndexPatternField[];
  private memoizedBrowserFields: (title: string, fields: IndexField[]) => BrowserFields;

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
        variables={{ sourceId, indexTypes }}
      >
        {({ data }) => {
          const logAlias = get('source.configuration.logAlias', data);
          const auditbeatAlias = get('source.configuration.auditbeatAlias', data);
          const packetbeatAlias = get('source.configuration.packetbeatAlias', data);
          const winbeatAlias = get('source.configuration.winbeatAlias', data);
          let indexPatternTitle: string[] = [];
          if (indexTypes.includes(IndexType.ANY)) {
            indexPatternTitle = [...indexPatternTitle, logAlias, auditbeatAlias, packetbeatAlias];
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
            if (indexTypes.includes(IndexType.WINBEAT)) {
              indexPatternTitle = [...indexPatternTitle, winbeatAlias];
            }
          }
          return children({
            auditbeatIndicesExist: get('source.status.auditbeatIndicesExist', data),
            filebeatIndicesExist: get('source.status.filebeatIndicesExist', data),
            browserFields: get('source.status.indexFields', data)
              ? this.memoizedBrowserFields(
                  indexPatternTitle.join(),
                  get('source.status.indexFields', data)
                )
              : {},
            indexPattern: {
              fields: get('source.status.indexFields', data)
                ? this.memoizedIndexFields(
                    indexPatternTitle.join(),
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

  private getIndexFields = (title: string, fields: IndexField[]): StaticIndexPatternField[] =>
    fields.map(field => pick(['name', 'searchable', 'type', 'aggregatable'], field));

  private getBrowserFields = (title: string, fields: IndexField[]): BrowserFields =>
    fields.reduce(
      (accumulator: BrowserFields, field: IndexField) =>
        set([field.category, 'fields', field.name], field, accumulator),
      {} as BrowserFields
    );
}

export const indicesExistOrDataTemporarilyUnavailable = (indicesExist: boolean | undefined) =>
  indicesExist || isUndefined(indicesExist);
