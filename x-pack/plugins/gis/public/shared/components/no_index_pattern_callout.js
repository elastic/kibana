/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import chrome from 'ui/chrome';

import React from 'react';
import { EuiCallOut, EuiLink } from '@elastic/eui';

export function NoIndexPatternCallout() {
  return (
    <EuiCallOut
      title="Couldn't find any index patterns with geospatial fields"
      color="warning"
    >
      <p>
        You&rsquo;ll need to{' '}
        <EuiLink href={chrome.addBasePath('/app/kibana#/management/kibana/index_pattern')}>
          create an index pattern
        </EuiLink>{' '}
        with geospatial fields.
      </p>
      <p>
        Don&rsquo;t have any geospatial data sets?{' '}
        <EuiLink href={chrome.addBasePath('/app/kibana#/home/tutorial_directory/sampleData')}>
          Get started with some sample data sets.
        </EuiLink>
      </p>
    </EuiCallOut>
  );
}
