/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
export interface IImmutableCache<KeyType, ValueType> {
  get(key: KeyType): ValueType | undefined;
  set(key: KeyType, value: ValueType): ImmutableCache<KeyType, ValueType>;
  has(key: KeyType): boolean;
  clear(): ImmutableCache<KeyType, ValueType>;
}

type Cache<ValueType> = Record<string, ValueType>;

export class ImmutableCache<KeyType, ValueType> implements IImmutableCache<KeyType, ValueType> {
  private cache: Cache<ValueType>;

  constructor(cache?: Cache<ValueType>) {
    this.cache = cache ?? {};
  }

  public get(key: KeyType): ValueType | undefined {
    const serializedKey = this.serialize(key);
    return this.cache[serializedKey];
  }

  public set(key: KeyType, value: ValueType): ImmutableCache<KeyType, ValueType> {
    const serializedKey = this.serialize(key);
    this.cache[serializedKey] = value;
    return new ImmutableCache(this.cache);
  }

  public has(key: KeyType): boolean {
    const serializedKey = this.serialize(key);
    return serializedKey in this.cache;
  }

  public clear(): ImmutableCache<KeyType, ValueType> {
    return new ImmutableCache();
  }

  private serialize(key: KeyType): string {
    if (typeof key === 'string') {
      return key;
    }

    return JSON.stringify(key, Object.keys(key).sort());
  }
}
