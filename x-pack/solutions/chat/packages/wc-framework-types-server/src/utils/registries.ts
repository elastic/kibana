/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Generic provider interface
 */
export interface Provider<T extends { id: string }> {
  has(id: string): boolean;
  get(id: string): T;
  getAllKeys(): string[];
  getAll(): T[];
}

/**
 * Generic registry interface
 */
export interface Registry<T extends { id: string }> extends Provider<T> {
  register(definition: T): void;
}

/**
 * Generic async provider interface
 */
export interface AsyncProvider<T extends { id: string }> {
  has(id: string): Promise<boolean>;
  get(id: string): Promise<T>;
  getAllKeys(): Promise<string[]>;
  getAll(): Promise<T[]>;
}
