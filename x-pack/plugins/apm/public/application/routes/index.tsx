/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { RouteComponentProps, RouteProps } from 'react-router-dom';

export type BreadcrumbTitle<T = {}> =
  | string
  | ((props: RouteComponentProps<T>) => string)
  | null;

export interface APMRouteDefinition<T = any> extends RouteProps {
  breadcrumb: BreadcrumbTitle<T>;
}
