/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EmbeddableThreads } from '@kbn/observability-shared-plugin/public';
import React from 'react';

export function Threads() {
  return <EmbeddableThreads kuery="" rangeFrom={0} rangeTo={1} />;
}
