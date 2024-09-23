/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

interface EntityTypeListViewColumn {
  field: string;
  fill: boolean;
}

interface EntityViewPanel {
  savedObjectId?: string;
  x: number;
  y: number;
}

export interface EntityViewPanelGroup {
  panels: EntityViewPanel[];
}

export interface EntityViewGrid {
  groups: EntityViewPanelGroup[];
}

export interface EntityViewTab {
  name: string;
  label: string;
}

export interface EntityView {
  view: {
    type: 'virtual';
  };
  tabs: EntityViewTab[];
}

export interface EntityTypeListView {
  columns: EntityTypeListViewColumn[];
}
