/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { calculateScore } from './calculate_search_score';

describe('calculateScore', () => {
  it('should return 80 when the search term is undefined', () => {
    const searchTerm = undefined;
    const valueToTest = 'value to test';
    const score = calculateScore(searchTerm, valueToTest);
    expect(score).toBe(80);
  });

  it('should return 80 when the search term is empty', () => {
    const searchTerm = '';
    const valueToTest = 'valute to test';
    const score = calculateScore(searchTerm, valueToTest);
    expect(score).toBe(80);
  });

  it('should return 100 when the search term matches the value', () => {
    const searchTerm = 'connector';
    const valueToTest = 'connector';
    const score = calculateScore(searchTerm, valueToTest);
    expect(score).toBe(100);
  });

  it('should return 90 when the search term starts with the value', () => {
    const searchTerm = 'connector';
    const valueToTest = 'connector test';
    const score = calculateScore(searchTerm, valueToTest);
    expect(score).toBe(90);
  });

  it('should return 75 when the search term includes the value', () => {
    const searchTerm = 'connector';
    const valueToTest = 'test connector somewhere';
    const score = calculateScore(searchTerm, valueToTest);
    expect(score).toBe(75);
  });

  it('should return 0 when the search term does not match the value', () => {
    const searchTerm = 'connector';
    const valueToTest = 'index';
    const score = calculateScore(searchTerm, valueToTest);
    expect(score).toBe(0);
  });
});
