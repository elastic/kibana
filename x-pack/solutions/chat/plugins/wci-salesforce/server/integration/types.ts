/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface BaseObject {
  id?: string;
  title?: string;
  description?: string;
  content?: string;
  content_semantic?: string;
  url?: string;
  object_type?: string;
  owner?: Identity;
  created_at?: string | Date;
  updated_at?: string | Date;
}

export interface Identity {
  email?: string;
  name?: string;
}

export interface SupportCase extends BaseObject {
  metadata?: {
    case_number?: string;
    priority?: string;
    status?: string;
    closed?: boolean;
    deleted?: boolean;
    account_id?: string;
    account_name?: string;
  };
  comments?: Array<{
    id?: string;
    author?: Identity;
    content?: string;
    created_at?: string | Date;
    updated_at?: string | Date;
  }>;
}

export interface Account extends BaseObject {
  metadata?: {
    record_type_id?: string;
    currency?: string;
    last_activity_date?: string | Date;
    is_partner?: boolean;
    is_customer_portal?: boolean;
  };
  contacts?: Array<{
    id?: string;
    name?: string;
    email?: string;
    phone?: string;
    title?: string;
    department?: string;
  }>;
}
