/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export class DataFormatter {
  protected getOutput(): string {
    throw new Error(`${this.constructor.name}.getOutput() not implemented!`);
  }

  public get output(): string {
    return this.getOutput();
  }
}
