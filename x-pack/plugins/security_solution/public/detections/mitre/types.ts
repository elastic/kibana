/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
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

export interface MitreSubtechniquesOptions extends MitreTechniquesOptions {
  techniqueId: string;
}
