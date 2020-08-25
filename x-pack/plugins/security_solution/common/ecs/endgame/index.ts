/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export interface EndgameEcs {
  exit_code?: number;

  file_name?: string;

  file_path?: string;

  logon_type?: number;

  parent_process_name?: string;

  pid?: number;

  process_name?: string;

  subject_domain_name?: string;

  subject_logon_id?: string;

  subject_user_name?: string;

  target_domain_name?: string;

  target_logon_id?: string;

  target_user_name?: string;
}
