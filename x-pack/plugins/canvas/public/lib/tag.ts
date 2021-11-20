/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface TagSpec {
  /**
   * name of the tag
   */
  name: string;
  /**
   * color of the tag
   */
  color: string;
}
export class Tag implements TagSpec {
  public name: string;
  public color: string;

  constructor(config: TagSpec) {
    this.name = config.name;
    this.color = config.color;
  }
}

export type TagFactory = () => TagSpec;
