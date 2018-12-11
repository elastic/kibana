/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { PageContent } from '../../components/page';

import { WithServiceMetadata } from '../../containers/metadata/with_service_metadata';
import { WithOptions } from '../../containers/with_options';

export const ServicesPageContent: React.SFC = () => (
  <PageContent>
    <WithOptions>
      {({ sourceId }) => (
        <WithServiceMetadata sourceId={sourceId} start={1543936027000} end={1543936827000}>
          {({ serviceMetadata, error, loading }) => (
            <div>
              <pre>ServiceMetadata: {JSON.stringify(serviceMetadata, null, 2)}</pre>
              <p>Error: {error}</p>
              <p>Loading: {loading}</p>
            </div>
          )}
        </WithServiceMetadata>
      )}
    </WithOptions>
  </PageContent>
);
