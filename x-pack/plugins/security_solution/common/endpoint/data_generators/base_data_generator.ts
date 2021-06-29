/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import seedrandom from 'seedrandom';
import uuid from 'uuid';

const OS_FAMILY = ['windows', 'macos', 'linux'];
/** Array of 14 day offsets */
const DAY_OFFSETS = Array.from({ length: 14 }, (_, i) => 8.64e7 * (i + 1));

/**
 * A generic base class to assist in creating domain specific data generators. It includes
 * several general purpose random data generators for use within the class and exposes one
 * public method named `generate()` which should be implemented by sub-classes.
 */
export class BaseDataGenerator<GeneratedDoc extends {} = {}> {
  /** A javascript seeded random number (float between 0 and 1). Don't use `Math.random()` */
  protected random: seedrandom.prng;

  constructor(seed: string | seedrandom.prng = Math.random().toString()) {
    if (typeof seed === 'string') {
      this.random = seedrandom(seed);
    } else {
      this.random = seed;
    }
  }

  /**
   * Generate a new record
   */
  public generate(): GeneratedDoc {
    throw new Error('method not implemented!');
  }

  /** Returns a future ISO date string */
  protected randomFutureDate(from?: Date): string {
    const now = from ? from.getTime() : Date.now();
    return new Date(now + this.randomChoice(DAY_OFFSETS)).toISOString();
  }

  /** Returns a past ISO date string */
  protected randomPastDate(from?: Date): string {
    const now = from ? from.getTime() : Date.now();
    return new Date(now - this.randomChoice(DAY_OFFSETS)).toISOString();
  }

  /**
   * Generate either `true` or `false`. By default, the boolean is calculated by determining if a
   * float is less than `0.5`, but that can be adjusted via the input argument
   *
   * @param isLessThan
   */
  protected randomBoolean(isLessThan: number = 0.5): boolean {
    return this.random() < isLessThan;
  }

  /** generate random OS family value */
  protected randomOSFamily(): string {
    return this.randomChoice(OS_FAMILY);
  }

  /** generate a UUID (v4) */
  protected randomUUID(): string {
    return uuid.v4();
  }

  /** Generate a random number up to the max provided */
  protected randomN(max: number): number {
    return Math.floor(this.random() * max);
  }

  protected *randomNGenerator(max: number, count: number) {
    let iCount = count;
    while (iCount > 0) {
      yield this.randomN(max);
      iCount = iCount - 1;
    }
  }

  /**
   * Create an array of a given size and fill it with data provided by a generator
   *
   * @param lengthLimit
   * @param generator
   * @protected
   */
  protected randomArray<T>(lengthLimit: number, generator: () => T): T[] {
    const rand = this.randomN(lengthLimit) + 1;
    return [...Array(rand).keys()].map(generator);
  }

  protected randomMac(): string {
    return [...this.randomNGenerator(255, 6)].map((x) => x.toString(16)).join('-');
  }

  protected randomIP(): string {
    return [10, ...this.randomNGenerator(255, 3)].map((x) => x.toString()).join('.');
  }

  protected randomVersion(): string {
    return [6, ...this.randomNGenerator(10, 2)].map((x) => x.toString()).join('.');
  }

  protected randomChoice<T>(choices: T[]): T {
    return choices[this.randomN(choices.length)];
  }

  protected randomString(length: number): string {
    return [...this.randomNGenerator(36, length)].map((x) => x.toString(36)).join('');
  }

  protected randomHostname(): string {
    return `Host-${this.randomString(10)}`;
  }
}
