/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const isUsingCustomRolloverPath = '_meta.hot.customRollover.enabled';

export const isUsingDefaultRolloverPath = '_meta.hot.isUsingDefaultRollover';

/**
 * These strings describe the path to their respective values in the serialized
 * ILM form.
 */
export const ROLLOVER_FORM_PATHS = {
  maxDocs: 'phases.hot.actions.rollover.max_docs',
  maxAge: 'phases.hot.actions.rollover.max_age',
  maxSize: 'phases.hot.actions.rollover.max_size',
  maxPrimaryShardSize: 'phases.hot.actions.rollover.max_primary_shard_size',
};

/**
 * This repository is provisioned by Elastic Cloud and will always
 * exist as a "managed" repository.
 */
export const CLOUD_DEFAULT_REPO = 'found-snapshots';
