/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { isUndefined } from 'lodash';
import { get, pick, set, difference } from 'lodash/fp';
import React from 'react';
import { Query } from 'react-apollo';
import { StaticIndexPattern } from 'ui/index_patterns';

import memoizeOne from 'memoize-one';
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

const indexTypesVariables = [IndexType.ANY];

export class WithSource extends React.PureComponent<WithSourceProps> {
  private memoizedIndexFields: (
    indexTypes: string[],
    title: string,
    fields: IndexField[]
  ) => StaticIndexPattern;
  private memoizedBrowserFields: (indexTypes: string[], fields: IndexField[]) => BrowserFields;
  private memoizedIndexTypesLowerCase: (indexTypes: string[]) => string[];

  constructor(props: WithSourceProps) {
    super(props);
    this.memoizedIndexFields = memoizeOne(this.getIndexFields);
    this.memoizedBrowserFields = memoizeOne(this.getBrowserFields);
    this.memoizedIndexTypesLowerCase = memoizeOne(this.getIndexTypesLowerCase);
  }

  public render() {
    const { children, sourceId, indexTypes } = this.props;

    return (
      <Query<SourceQuery.Query, SourceQuery.Variables>
        query={sourceQuery}
        fetchPolicy="cache-first"
        notifyOnNetworkStatusChange
        variables={{ sourceId, indexTypes: indexTypesVariables }}
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
          const indexTypesLowerCase = this.memoizedIndexTypesLowerCase(indexTypes);

          return children({
            auditbeatIndicesExist: get('source.status.auditbeatIndicesExist', data),
            filebeatIndicesExist: get('source.status.filebeatIndicesExist', data),
            winlogbeatIndicesExist: get('source.status.winlogbeatIndicesExist', data),
            browserFields: this.memoizedBrowserFields(
              indexTypesLowerCase,
              get('source.status.indexFields', data)
            ),
            indexPattern: this.memoizedIndexFields(
              indexTypesLowerCase,
              indexPatternTitle.join(),
              get('source.status.indexFields', data)
            ),
          });
        }}
      </Query>
    );
  }

  private getIndexTypesLowerCase = (indexTypes: string[]) =>
    indexTypes.map(i => i.toLocaleLowerCase());

  private getIndexFields = (
    indexTypes: string[],
    title: string,
    fields: IndexField[]
  ): StaticIndexPattern =>
    fields && fields.length > 0
      ? {
          fields: fields
            .filter(
              item =>
                indexTypes.includes('any') ||
                difference(item.indexes, indexTypes).length !== item.indexes.length
            )
            .map(field => pick(['name', 'searchable', 'type', 'aggregatable'], field)),
          title,
        }
      : { fields: [], title };

  private getBrowserFields = (indexTypes: string[], fields: IndexField[]): BrowserFields =>
    fields && fields.length > 0
      ? fields
          .filter(
            item =>
              indexTypes.includes('any') ||
              difference(item.indexes, indexTypes).length !== item.indexes.length
          )
          .reduce<BrowserFields>(
            (accumulator: BrowserFields, field: IndexField) =>
              set([field.category, 'fields', field.name], field, accumulator),
            {}
          )
      : {};
}

export const indicesExistOrDataTemporarilyUnavailable = (indicesExist: boolean | undefined) =>
  indicesExist || isUndefined(indicesExist);
