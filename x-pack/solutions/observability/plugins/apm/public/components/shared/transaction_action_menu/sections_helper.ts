/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty } from 'lodash';
import type { MouseEvent, ReactNode } from 'react';

export interface Action<TLabel extends ReactNode = ReactNode> {
  key: string;
  label: TLabel;
  href?: string;
  onClick?: (event: MouseEvent) => void;
  condition: boolean;
}

export interface Section<TLabel extends ReactNode = ReactNode> {
  key: string;
  title?: string;
  subtitle?: string;
  actions: Array<Action<TLabel>>;
}

export type SectionRecord<TLabel extends ReactNode = ReactNode> = Record<
  string,
  Array<Section<TLabel>>
>;

/** Filter out actions that shouldnt be shown and sections without any actions. */
export function getNonEmptySections<TLabel extends ReactNode>(
  sectionRecord: SectionRecord<TLabel>
): Array<Array<Section<TLabel>>> {
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
