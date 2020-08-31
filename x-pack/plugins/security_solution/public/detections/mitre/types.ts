/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export interface MitreOptions {
  id: string;
  name: string;
  reference: string;
  value: string;
}

export interface MitreTacticsOptions extends MitreOptions {
  text: string;
}

export interface MitreTechniquesOptions extends MitreOptions {
  label: string;
  tactics: string;
}
