/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface LinkPanelListItem {
  [key: string]: string | number | undefined;
  copy?: string;
  count: number;
  path: string;
  title: string;
  hostPath?: string;
}

export interface LinkPanelViewProps {
  buttonHref?: string;
  isInspectEnabled?: boolean;
  isPluginDisabled?: boolean;
  listItems: LinkPanelListItem[];
  splitPanel?: JSX.Element;
  totalCount?: number;
  allIntegrationsInstalled?: boolean;
}
