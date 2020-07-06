/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { LevelLogger } from './level_logger';

export function createTaggedLogger(logger: LevelLogger, tags: string[]) {
  return (msg: string, additionalTags = []) => {
    const allTags = [...tags, ...additionalTags];

    if (allTags.includes('info')) {
      const newTags = allTags.filter((t) => t !== 'info'); // Ensure 'info' is not included twice
      logger.info(msg, newTags);
    } else if (allTags.includes('debug')) {
      const newTags = allTags.filter((t) => t !== 'debug');
      logger.debug(msg, newTags);
    } else if (allTags.includes('warn') || allTags.includes('warning')) {
      const newTags = allTags.filter((t) => t !== 'warn' && t !== 'warning');
      logger.warn(msg, newTags);
    } else {
      logger.error(msg, allTags);
    }
  };
}
