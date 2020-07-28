/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ReactElement } from 'react';
import { AppUnmount } from 'kibana/public';
import { UMBadge } from '../badge';
import { UptimeAppProps } from '../uptime_app';

export interface UMFrontendLibs {
  framework: UMFrameworkAdapter;
}

export type UMUpdateBadge = (badge: UMBadge) => void;

export type BootstrapUptimeApp = (props: UptimeAppProps) => ReactElement<any>;

export interface UMFrameworkAdapter {
  render(element: any): Promise<AppUnmount>;
}
