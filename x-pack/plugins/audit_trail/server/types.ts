/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { Observable } from 'rxjs';
/**
 * Event enhanced with request context data. Provided to an external consumer.
 * @public
 */
export interface AuditEvent {
  message: string;
  type: string;
  scope?: string;
  user?: string;
  space?: string;
}

export interface AuditTrailPluginSetup {
  event$: Observable<AuditEvent>;
}
