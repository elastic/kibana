/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  CreateRuleExceptionListItemsRequestBodyInput,
  ExceptionListItemEntry,
} from '@kbn/securitysolution-exceptions-common/api';
import type { CreateRuleExceptionListItemsProps } from '@kbn/securitysolution-exceptions-common/api/quickstart_client.gen';

export const test: CreateRuleExceptionListItemsRequestBodyInput['items'][0] = {
  description: 'test',
  type: 'simple',
  name: 'test',
  entries: [
    {
      type: 'match',
      field: 'test',
      value: 'test',
      operator: 'included',
    },
  ],
};

export const getMatchEntry: () => ExceptionListItemEntry = () => ({
  type: 'match',
  field: 'host.name',
  value: 'host-1',
  operator: 'included',
});

export const buildCreateRuleExceptionListItemsProps: (props: {
  id: string;
}) => CreateRuleExceptionListItemsProps = ({ id }) => ({
  params: { id },
  body: {
    items: [
      {
        description: 'test',
        type: 'simple',
        name: 'test',
        entries: [
          {
            type: 'match',
            field: 'test',
            value: 'test',
            operator: 'included',
          },
        ],
      },
    ],
  },
});
