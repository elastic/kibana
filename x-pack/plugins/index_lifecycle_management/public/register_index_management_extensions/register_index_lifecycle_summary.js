/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { addSummaryExtension } from '../../../index_management/public/index_management_extensions';
import { IndexLifecycleSummary } from '../components/index_lifecycle_summary';
addSummaryExtension((index) => {
  return <IndexLifecycleSummary index={index} />;
});

