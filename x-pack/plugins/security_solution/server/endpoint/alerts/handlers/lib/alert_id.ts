/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { AlertIdError } from './error';

/**
 * Abstraction over alert IDs.
 */
export class AlertId {
  protected readonly _index: string;
  protected readonly _id: string;

  constructor(index: string, id: string) {
    this._index = index;
    this._id = id;
  }

  public get index() {
    return this._index;
  }

  public get id() {
    return this._id;
  }

  static fromEncoded(encoded: string): AlertId {
    try {
      const value = encoded.replace(/\-/g, '+').replace(/_/g, '/');
      const data = Buffer.from(value, 'base64').toString('utf8');
      const { index, id } = JSON.parse(data);
      return new AlertId(index, id);
    } catch (error) {
      throw new AlertIdError(`Unable to decode alert id: ${encoded}`);
    }
  }

  toString(): string {
    const value = JSON.stringify({ index: this.index, id: this.id });
    // replace invalid URL characters with valid ones
    return Buffer.from(value, 'utf8')
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/g, '');
  }
}
