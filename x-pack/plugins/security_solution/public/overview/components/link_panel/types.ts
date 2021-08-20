/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface LinkPanelListItem {
  title: string;
  count: number;
  path: string;
  copy?: string;
  [key: string]: string | number | undefined;
}

export interface LinkPanelViewProps {
  buttonHref?: string;
  isPluginDisabled?: boolean;
  isInspectEnabled?: boolean;
  listItems: LinkPanelListItem[];
  splitPanel?: JSX.Element;
  totalCount?: number;
}
