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
import { SavedObjectsErrorHelpers } from '@kbn/core-saved-objects-server';
import { sloSchema } from '@kbn/slo-schema';

import { StoredSLO, SLO } from '../../domain/models';
import { SO_SLO_TYPE } from '../../saved_objects';
import { SLOIdConflict, SLONotFound } from '../../errors';

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
  CreationTime: 'CreationTime',
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
  save(slo: SLO, options?: { throwOnConflict: boolean }): Promise<SLO>;
  findAllByIds(ids: string[]): Promise<SLO[]>;
  findById(id: string): Promise<SLO>;
  deleteById(id: string): Promise<void>;
  find(criteria: Criteria, sort: Sort, pagination: Pagination): Promise<Paginated<SLO>>;
}

export class KibanaSavedObjectsSLORepository implements SLORepository {
  constructor(private soClient: SavedObjectsClientContract) {}

  async save(slo: SLO, options = { throwOnConflict: false }): Promise<SLO> {
    let existingSavedObjectId;
    const findResponse = await this.soClient.find<StoredSLO>({
      type: SO_SLO_TYPE,
      page: 1,
      perPage: 1,
      filter: `slo.attributes.id:(${slo.id})`,
    });
    if (findResponse.total === 1) {
      if (options.throwOnConflict) {
        throw new SLOIdConflict(`SLO [${slo.id}] already exists`);
      }

      existingSavedObjectId = findResponse.saved_objects[0].id;
    }

    const savedSLO = await this.soClient.create<StoredSLO>(SO_SLO_TYPE, toStoredSLO(slo), {
      id: existingSavedObjectId,
      overwrite: true,
    });

    return toSLO(savedSLO.attributes);
  }

  async findById(id: string): Promise<SLO> {
    const response = await this.soClient.find<StoredSLO>({
      type: SO_SLO_TYPE,
      page: 1,
      perPage: 1,
      filter: `slo.attributes.id:(${id})`,
    });

    if (response.total === 0) {
      throw new SLONotFound(`SLO [${id}] not found`);
    }

    return toSLO(response.saved_objects[0].attributes);
  }

  async deleteById(id: string): Promise<void> {
    const response = await this.soClient.find<StoredSLO>({
      type: SO_SLO_TYPE,
      page: 1,
      perPage: 1,
      filter: `slo.attributes.id:(${id})`,
    });

    if (response.total === 0) {
      throw new SLONotFound(`SLO [${id}] not found`);
    }

    await this.soClient.delete(SO_SLO_TYPE, response.saved_objects[0].id);
  }

  async find(criteria: Criteria, sort: Sort, pagination: Pagination): Promise<Paginated<SLO>> {
    const { search, searchFields } = buildSearch(criteria);
    const filterKuery = buildFilterKuery(criteria);
    const { sortField, sortOrder } = buildSortQuery(sort);
    const response = await this.soClient.find<StoredSLO>({
      type: SO_SLO_TYPE,
      page: pagination.page,
      perPage: pagination.perPage,
      search,
      searchFields,
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

  async findAllByIds(ids: string[]): Promise<SLO[]> {
    if (ids.length === 0) return [];

    try {
      const response = await this.soClient.find<StoredSLO>({
        type: SO_SLO_TYPE,
        page: 1,
        perPage: ids.length,
        filter: `slo.attributes.id:(${ids.join(' or ')})`,
      });
      return response.saved_objects.map((slo) => toSLO(slo.attributes));
    } catch (err) {
      if (SavedObjectsErrorHelpers.isNotFoundError(err)) {
        throw new SLONotFound(`SLOs [${ids.join(',')}] not found`);
      }
      throw err;
    }
  }
}

function buildSearch(criteria: Criteria): {
  search: string | undefined;
  searchFields: string[] | undefined;
} {
  if (!criteria.name) {
    return { search: undefined, searchFields: undefined };
  }

  return { search: addWildcardsIfAbsent(criteria.name), searchFields: ['name'] };
}

function buildFilterKuery(criteria: Criteria): string | undefined {
  const filters: string[] = [];
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
    case SortField.CreationTime:
    default:
      sortField = 'created_at';
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
