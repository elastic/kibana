/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

const DataIngestionHubHeaderComponent: React.FC = () => {
  return <div data-test-subj="data-ingestion-hub-header" />;
};

export const DataIngestionHubHeader = React.memo(DataIngestionHubHeaderComponent);
