/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty } from 'lodash';

export interface Action {
  key: string;
  label: string;
  href?: string;
  onClick?: () => void;
  condition: boolean;
}

interface Section {
  key: string;
  title?: string;
  subtitle?: string;
  actions: Action[];
}

export type SectionRecord = Record<string, Section[]>;

/** Filter out actions that shouldnt be shown and sections without any actions. */
export function getNonEmptySections(sectionRecord: SectionRecord) {
  return Object.values(sectionRecord)
    .map((sections) =>
      sections
        .map((section) => ({
          ...section,
          actions: section.actions.filter((action) => action.condition),
        }))
        .filter((section) => !isEmpty(section.actions))
    )
    .filter((sections) => !isEmpty(sections));
}
