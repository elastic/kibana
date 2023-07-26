/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

interface FuncParameters {
  name: string;
  type: 'string' | 'int' | 'boolean' | 'object';
  description: string;
}

export interface Func {
  id: string;
  function_name: string;
  parameters: FuncParameters[];
}

export function useFunctions(): Func[] {
  return [
    {
      id: '1',
      function_name: 'get_service_summary',
      parameters: [
        {
          name: 'service',
          type: 'string',
          description: 'The service',
        },
      ],
    },
    {
      id: '2',
      function_name: 'get_apm_chart',
      parameters: [],
    },
    {
      id: '3',
      function_name: 'get_dependencies',
      parameters: [
        {
          name: 'service',
          type: 'string',
          description: 'The service',
        },
      ],
    },
    {
      id: '4',
      function_name: 'get_correlation_values',
      parameters: [],
    },
    {
      id: '4',
      function_name: 'get_error',
      parameters: [],
    },
  ];
}
