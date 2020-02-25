/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { History } from 'history';

export * from './logs_router';
export * from './metrics_router';

interface RouterProps {
  history: History;
}

export type AppRouter = React.FC<RouterProps>;
