/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const analysisTableTextfield = [
  {
    fieldName: 'message',
    fieldValue: 'an unexpected error occured',
    logRate: 'Chart type:bar chart',
    pValue: '0.00000100',
    impact: 'Medium',
  },
  {
    fieldName: 'response_code',
    fieldValue: '500',
    logRate: 'Chart type:bar chart',
    pValue: '3.61e-12',
    impact: 'High',
  },
  {
    fieldName: 'url',
    fieldValue: 'home.php',
    impact: 'Low',
    logRate: 'Chart type:bar chart',
    pValue: '0.00974',
  },
];
