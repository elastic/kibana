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

export interface MitreTactic {
  id: string;
  name: string;
  reference: string; // A link to the tactic's page
}

export interface MitreTechnique {
  id: string;
  name: string;
  reference: string; // A link to the technique's page
  tactics: string[]; // Tactics this technique assigned to (lowercase dash separated)
}

export interface MitreSubTechnique {
  id: string;
  name: string;
  reference: string; // A link to the subtechnique's page
  tactics: string[]; // Tactics this technique assigned to (lowercase dash separated)
  techniqueId: string; // A technique id this subtechnique assigned to
}
