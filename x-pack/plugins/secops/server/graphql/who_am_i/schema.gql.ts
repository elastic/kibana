/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import gql from 'graphql-tag';

export const whoAmISchema = gql`
  type SayMyName {
    "The id of the source"
    appName: String!
  }

  extend type Source {
    "Just a simple example to get the app name"
    whoAmI: SayMyName
  }
`;
