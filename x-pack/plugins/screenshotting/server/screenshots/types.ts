/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface Screenshot {
  /**
   * Screenshot PNG image data.
   */
  data: Buffer;

  /**
   * Screenshot title.
   */
  title: string | null;

  /**
   * Screenshot description.
   */
  description: string | null;
}
