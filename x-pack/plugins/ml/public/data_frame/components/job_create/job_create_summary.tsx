/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { SFC } from 'react';

import { StaticIndexPattern } from 'ui/index_patterns';

interface Props {
  indexPattern: StaticIndexPattern;
}

export const JobCreateSummary: SFC<Props> = React.memo(({ indexPattern }) => {
  return null;
});
