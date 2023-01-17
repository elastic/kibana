/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { fold } from 'fp-ts/lib/Either';
import { pipe } from 'fp-ts/lib/pipeable';

import { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import { SavedObjectsErrorHelpers } from '@kbn/core-saved-objects-common';
import { sloSchema } from '@kbn/slo-schema';

import { StoredSLO, SLO } from '../../domain/models';
import { SO_SLO_TYPE } from '../../saved_objects';
import { SLONotFound } from '../../errors';

type ObjectValues<T> = T[keyof T];

export interface Criteria {
  name?: string;
  indicatorTypes?: string[];
}

export interface Pagination {
  page: number;
  perPage: number;
}

export const SortDirection = {
  Asc: 'Asc',
  Desc: 'Desc',
} as const;

type SortDirection = ObjectValues<typeof SortDirection>;

export const SortField = {
  Name: 'Name',
  IndicatorType: 'IndicatorType',
};

type SortField = ObjectValues<typeof SortField>;

export interface Sort {
  field: SortField;
  direction: SortDirection;
}

export interface Paginated<T> {
  page: number;
  perPage: number;
  total: number;
  results: T[];
}

export interface SLORepository {
  save(slo: SLO): Promise<SLO>;
  findById(id: string): Promise<SLO>;
  deleteById(id: string): Promise<void>;
  find(criteria: Criteria, sort: Sort, pagination: Pagination): Promise<Paginated<SLO>>;
}

export class KibanaSavedObjectsSLORepository implements SLORepository {
  constructor(private soClient: SavedObjectsClientContract) {}

  async save(slo: SLO): Promise<SLO> {
    const savedSLO = await this.soClient.create<StoredSLO>(SO_SLO_TYPE, toStoredSLO(slo), {
      id: slo.id,
      overwrite: true,
    });

    return toSLO(savedSLO.attributes);
  }

  async findById(id: string): Promise<SLO> {
    try {
      const slo = await this.soClient.get<StoredSLO>(SO_SLO_TYPE, id);
      return toSLO(slo.attributes);
    } catch (err) {
      if (SavedObjectsErrorHelpers.isNotFoundError(err)) {
        throw new SLONotFound(`SLO [${id}] not found`);
      }
      throw err;
    }
  }

  async deleteById(id: string): Promise<void> {
    try {
      await this.soClient.delete(SO_SLO_TYPE, id);
    } catch (err) {
      if (SavedObjectsErrorHelpers.isNotFoundError(err)) {
        throw new SLONotFound(`SLO [${id}] not found`);
      }
      throw err;
    }
  }

  async find(criteria: Criteria, sort: Sort, pagination: Pagination): Promise<Paginated<SLO>> {
    const filterKuery = buildFilterKuery(criteria);
    const { sortField, sortOrder } = buildSortQuery(sort);
    const response = await this.soClient.find<StoredSLO>({
      type: SO_SLO_TYPE,
      page: pagination.page,
      perPage: pagination.perPage,
      filter: filterKuery,
      sortField,
      sortOrder,
    });

    return {
      total: response.total,
      page: response.page,
      perPage: response.per_page,
      results: response.saved_objects.map((slo) => toSLO(slo.attributes)),
    };
  }
}

function buildFilterKuery(criteria: Criteria): string | undefined {
  const filters: string[] = [];
  if (!!criteria.name) {
    filters.push(`(slo.attributes.name: ${addWildcardsIfAbsent(criteria.name)})`);
  }

  if (!!criteria.indicatorTypes) {
    const indicatorTypesFilter: string[] = criteria.indicatorTypes.map(
      (indicatorType) => `slo.attributes.indicator.type: ${indicatorType}`
    );
    filters.push(`(${indicatorTypesFilter.join(' or ')})`);
  }

  return filters.length > 0 ? filters.join(' and ') : undefined;
}

function buildSortQuery(sort: Sort): { sortField: string; sortOrder: 'asc' | 'desc' } {
  let sortField: string;
  switch (sort.field) {
    case SortField.IndicatorType:
      sortField = 'indicator.type';
      break;
    case SortField.Name:
    default:
      sortField = 'name';
      break;
  }

  return {
    sortField,
    sortOrder: sort.direction === SortDirection.Desc ? 'desc' : 'asc',
  };
}

function toStoredSLO(slo: SLO): StoredSLO {
  return sloSchema.encode(slo);
}

function toSLO(storedSLO: StoredSLO): SLO {
  return pipe(
    sloSchema.decode(storedSLO),
    fold(() => {
      throw new Error('Invalid Stored SLO');
    }, t.identity)
  );
}

const WILDCARD_CHAR = '*';
function addWildcardsIfAbsent(value: string): string {
  let updatedValue = value;
  if (updatedValue.substring(0, 1) !== WILDCARD_CHAR) {
    updatedValue = `${WILDCARD_CHAR}${updatedValue}`;
  }

  if (value.substring(value.length - 1) !== WILDCARD_CHAR) {
    updatedValue = `${updatedValue}${WILDCARD_CHAR}`;
  }

  return updatedValue;
}
