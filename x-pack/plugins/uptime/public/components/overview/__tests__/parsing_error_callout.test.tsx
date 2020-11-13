/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { shallowWithIntl } from '@kbn/test/jest';
import { ParsingErrorCallout } from '../parsing_error_callout';

describe('OverviewPageParsingErrorCallout', () => {
  it('renders without errors when a valid error is provided', () => {
    expect(
      shallowWithIntl(
        <ParsingErrorCallout
          error={{ message: 'Unable to convert to Elasticsearch query, invalid syntax.' }}
        />
      )
    ).toMatchSnapshot();
  });

  it('renders without errors when an error with no message is provided', () => {
    const error: any = {};
    expect(shallowWithIntl(<ParsingErrorCallout error={error} />)).toMatchSnapshot();
  });
});
