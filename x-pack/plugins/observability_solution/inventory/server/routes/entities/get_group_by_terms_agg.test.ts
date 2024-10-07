/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EntityType } from '../../../common/entities';
import { getGroupByTermsAgg } from './get_group_by_terms_agg';

describe('getGroupByTermsAgg', () => {
  it('should return an empty object when no fields are provided', () => {
    const result = getGroupByTermsAgg([]);
    expect(result).toEqual({});
  });

  it('should return a valid aggregation structure for a single field', () => {
    const fields = new Map(['host' as EntityType, 'host.name']);
    const result = getGroupByTermsAgg(fields);
    expect(result).toEqual({
      host: {
        terms: {
          field: 'host.name',
          size: 500,
        },
      },
    });
  });

  // it('should return a valid aggregation structure for multiple fields', () => {
  //   const result = getGroupByTermsAgg(['host.name', 'service.name']);
  //   expect(result).toEqual({
  //     'host.name': {
  //       terms: {
  //         field: 'host.name',
  //         size: 500,
  //       },
  //     },
  //     'service.name': {
  //       terms: {
  //         field: 'service.name',
  //         size: 500,
  //       },
  //     },
  //   });
  // });

  // it('should allow overriding the default maxSize value', () => {
  //   const result = getGroupByTermsAgg(['host.name'], 100);
  //   expect(result).toEqual({
  //     'host.name': {
  //       terms: {
  //         field: 'host.name',
  //         size: 100,
  //       },
  //     },
  //   });
  // });

  // it('should apply maxSize to all fields', () => {
  //   const result = getGroupByTermsAgg(['host.name', 'service.name'], 200);
  //   expect(result).toEqual({
  //     'host.name': {
  //       terms: {
  //         field: 'host.name',
  //         size: 200,
  //       },
  //     },
  //     'service.name': {
  //       terms: {
  //         field: 'service.name',
  //         size: 200,
  //       },
  //     },
  //   });
  // });
});
