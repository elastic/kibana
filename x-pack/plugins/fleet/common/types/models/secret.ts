/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface Secret {
  id: string;
}

export interface SecretElasticDoc {
  value: string;
}
// this replaces a var value with a reference to a secret
export interface VarSecretReference {
  id: string;
  isSecretRef: true;
}
// this is used in the top level secret_refs array on package and agent policies
export interface PolicySecretReference {
  id: string;
}
