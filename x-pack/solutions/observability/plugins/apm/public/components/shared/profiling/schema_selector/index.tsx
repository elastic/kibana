/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import {
  EmbeddableProfilingSchemaSelector,
  useProfilingSchemaState,
} from '@kbn/observability-shared-plugin/public';
import React from 'react';

interface Props {
  start: string;
  end: string;
  /** Query that the profiling data of the schemas has to match */
  kuery: string;
}

/** Selects the profiling schema shared through `ProfilingSchemaStateProvider` */
export function ProfilingSchemaSelector({ start, end, kuery }: Props) {
  const { schema, setSchema } = useProfilingSchemaState();

  return (
    <EuiFlexGroup>
      <EuiFlexItem grow={false}>
        <EmbeddableProfilingSchemaSelector
          rangeFrom={new Date(start).valueOf()}
          rangeTo={new Date(end).valueOf()}
          kuery={kuery}
          schema={schema}
          onSchemaChange={setSchema}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
