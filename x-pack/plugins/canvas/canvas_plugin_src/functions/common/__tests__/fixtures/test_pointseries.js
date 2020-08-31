/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const testPlot = {
  type: 'pointseries',
  columns: {
    x: { type: 'date', role: 'dimension', expression: 'time' },
    y: {
      type: 'number',
      role: 'dimension',
      expression: 'price',
    },
    size: {
      type: 'number',
      role: 'dimension',
      expression: 'quantity',
    },
    color: {
      type: 'string',
      role: 'dimension',
      expression: 'name',
    },
    text: {
      type: 'number',
      role: 'dimension',
      expression: 'price',
    },
  },
  rows: [
    {
      x: 1517842800950,
      y: 67,
      size: 240,
      color: 'product3',
      text: 67,
    },
    {
      x: 1517842800950,
      y: 605,
      size: 100,
      color: 'product1',
      text: 605,
    },
    {
      x: 1517842800950,
      y: 216,
      size: 350,
      color: 'product2',
      text: 216,
    },
    {
      x: 1517929200950,
      y: 583,
      size: 200,
      color: 'product1',
      text: 583,
    },
    {
      x: 1517929200950,
      y: 200,
      size: 256,
      color: 'product2',
      text: 200,
    },
    {
      x: 1517842800950,
      y: 311,
      size: 447,
      color: 'product4',
      text: 311,
    },
  ],
};

export const testPie = {
  type: 'pointseries',
  columns: {
    color: {
      type: 'string',
      role: 'dimension',
      expression: 'name',
    },
    size: {
      type: 'number',
      role: 'measure',
      expression: 'mean(price)',
    },
  },
  rows: [
    { color: 'product2', size: 202 },
    { color: 'product3', size: 67 },
    { color: 'product4', size: 311 },
    { color: 'product1', size: 536 },
    { color: 'product5', size: 288 },
  ],
};
