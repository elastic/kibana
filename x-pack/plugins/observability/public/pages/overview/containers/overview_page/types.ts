/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface Bucket {
  start?: number;
  end?: number;
}
export type BucketSize = { bucketSize: number; intervalString: string } | undefined;

export interface PageHeaderProps {
  showTour?: boolean;
  onTourDismiss: () => void;
  handleGuidedSetupClick: () => void;
  onTimeRangeRefresh: () => void;
}
