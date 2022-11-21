/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface ActionContext {
  field: string;
  value: string;
  fieldType: string;
  nodeRef: React.MutableRefObject<HTMLDivElement | null>;
  extraContentNodeRef: React.MutableRefObject<HTMLDivElement | null>;
  metadata?: {
    scopeId?: string;
  };
}
