/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Datatable } from '@kbn/expressions-plugin/common';

export interface TagcloudState {
  layerId: string;
  tagAccessor?: string;
  valueAccessor?: string;
  maxFontSize: number;
  minFontSize: number;
  showLabel: boolean;
}

export interface TagcloudConfig extends TagcloudState {
  title: string;
  description: string;
}

export interface TagcloudProps {
  data: Datatable;
  args: TagcloudConfig;
}
