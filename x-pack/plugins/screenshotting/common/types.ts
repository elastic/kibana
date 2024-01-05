/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Collected performance metrics during a screenshotting session.
 */
export interface PerformanceMetrics {
  /**
   * The percentage of CPU time spent by the browser divided by number or cores.
   */
  cpu?: number;

  /**
   * The percentage of CPU in percent untis.
   */
  cpuInPercentage?: number;

  /**
   * The total amount of memory used by the browser.
   */
  memory?: number;

  /**
   * The total amount of memory used by the browser in megabytes.
   */
  memoryInMegabytes?: number;
}

/**
 * Timestamp metrics about a running screenshot task
 * which determine the maximum timeouts possible
 */
export interface TaskInstanceFields {
  /**
   * The date and time that this task started execution. This is used to determine
   * the "real" runAt that ended up running the task. This value is only set
   * when status is set to "running".
   */
  startedAt: Date | null;

  /**
   * The date and time that this task should re-execute if stuck in "running" / timeout
   * status. This value is only set when status is set to "running".
   */
  retryAt: Date | null;
}
