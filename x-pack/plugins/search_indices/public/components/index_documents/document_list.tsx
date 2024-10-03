/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { MappingProperty, SearchHit } from '@elastic/elasticsearch/lib/api/types';

import { Result, resultMetaData, resultToField } from '@kbn/search-index-documents';

import { EuiSpacer } from '@elastic/eui';

import { RecentDocsActionMessage } from './recent_docs_action_message';

export interface DocumentListProps {
  indexName: string;
  docs: SearchHit[];
  mappingProperties: Record<string, MappingProperty>;
}

export const DocumentList = ({ indexName, docs, mappingProperties }: DocumentListProps) => {
  return (
    <>
      <RecentDocsActionMessage indexName={indexName} />
      <EuiSpacer size="m" />
      {docs.map((doc) => {
        return (
          <React.Fragment key={doc._id}>
            <Result fields={resultToField(doc, mappingProperties)} metaData={resultMetaData(doc)} />
            <EuiSpacer size="s" />
          </React.Fragment>
        );
      })}
    </>
  );
};
