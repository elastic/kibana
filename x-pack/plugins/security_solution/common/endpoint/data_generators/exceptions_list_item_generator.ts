/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ExceptionListItemSchema,
  CreateExceptionListItemSchema,
  UpdateExceptionListItemSchema,
} from '@kbn/securitysolution-io-ts-list-types';
import {
  ENDPOINT_EVENT_FILTERS_LIST_ID,
  ENDPOINT_TRUSTED_APPS_LIST_ID,
} from '@kbn/securitysolution-list-constants';
import { BaseDataGenerator } from './base_data_generator';
import { ConditionEntryField } from '../types';
import { BY_POLICY_ARTIFACT_TAG_PREFIX } from '../service/artifacts/constants';

/** Utility that removes null and undefined from a Type's property value */
type NonNullableTypeProperties<T> = {
  [P in keyof T]-?: NonNullable<T[P]>;
};

/**
 * Normalizes the create type to remove `undefined`/`null` from the returned type since the generator or sure to
 * create a value for (almost) all properties
 */
type CreateExceptionListItemSchemaWithNonNullProps = NonNullableTypeProperties<
  Omit<CreateExceptionListItemSchema, 'meta'>
> &
  Pick<CreateExceptionListItemSchema, 'meta'>;

type UpdateExceptionListItemSchemaWithNonNullProps = NonNullableTypeProperties<
  Omit<UpdateExceptionListItemSchema, 'meta'>
> &
  Pick<UpdateExceptionListItemSchema, 'meta'>;

export class ExceptionsListItemGenerator extends BaseDataGenerator<ExceptionListItemSchema> {
  generate(overrides: Partial<ExceptionListItemSchema> = {}): ExceptionListItemSchema {
    const exceptionItem: ExceptionListItemSchema = {
      _version: this.randomString(5),
      comments: [],
      created_at: this.randomPastDate(),
      created_by: this.randomUser(),
      description: 'created by ExceptionListItemGenerator',
      entries: [
        {
          field: 'process.hash.md5',
          operator: 'included',
          type: 'match',
          value: '741462ab431a22233C787BAAB9B653C7',
        },
      ],
      id: this.seededUUIDv4(),
      item_id: this.seededUUIDv4(),
      list_id: 'endpoint_list_id',
      meta: undefined,
      name: `Generated Exception (${this.randomString(5)})`,
      namespace_type: 'agnostic',
      os_types: [this.randomOSFamily()] as ExceptionListItemSchema['os_types'],
      tags: [`${BY_POLICY_ARTIFACT_TAG_PREFIX}all`],
      tie_breaker_id: this.seededUUIDv4(),
      type: 'simple',
      updated_at: '2020-04-20T15:25:31.830Z',
      updated_by: this.randomUser(),
      ...(overrides || {}),
    };

    // If the `entries` was not overwritten, then add in the PATH condition with a
    // value that is OS appropriate
    if (!overrides.entries) {
      exceptionItem.entries.push({
        field: ConditionEntryField.PATH,
        operator: 'included',
        type: 'match',
        value: exceptionItem.os_types[0] === 'windows' ? 'c:\\fol\\bin.exe' : '/one/two/three',
      });
    }

    return exceptionItem;
  }

  generateForCreate(
    overrides: Partial<CreateExceptionListItemSchema> = {}
  ): CreateExceptionListItemSchemaWithNonNullProps {
    const {
      /* eslint-disable @typescript-eslint/naming-convention */
      description,
      entries,
      list_id,
      name,
      type,
      comments,
      item_id,
      meta,
      namespace_type,
      os_types,
      tags,
      /* eslint-enable @typescript-eslint/naming-convention */
    } = this.generate();

    return {
      description,
      entries,
      list_id,
      name,
      type,
      comments,
      item_id,
      meta,
      namespace_type,
      os_types,
      tags,
      ...overrides,
    };
  }

  generateTrustedApp(overrides: Partial<ExceptionListItemSchema> = {}): ExceptionListItemSchema {
    const trustedApp = this.generate(overrides);

    return {
      ...trustedApp,
      name: `Trusted app (${this.randomString(5)})`,
      list_id: ENDPOINT_TRUSTED_APPS_LIST_ID,
      // Remove the hash field which the generator above currently still sets to a field that is not
      // actually valid when used with the Exception List
      entries: trustedApp.entries.filter((entry) => entry.field !== ConditionEntryField.HASH),
    };
  }

  generateTrustedAppForCreate(
    overrides: Partial<CreateExceptionListItemSchema> = {}
  ): CreateExceptionListItemSchemaWithNonNullProps {
    const {
      /* eslint-disable @typescript-eslint/naming-convention */
      description,
      entries,
      list_id,
      name,
      type,
      comments,
      item_id,
      meta,
      namespace_type,
      os_types,
      tags,
      /* eslint-enable @typescript-eslint/naming-convention */
    } = this.generateTrustedApp();

    return {
      description,
      entries,
      list_id,
      name,
      type,
      comments,
      item_id,
      meta,
      namespace_type,
      os_types,
      tags,
      ...overrides,
    };
  }

  generateTrustedAppForUpdate(
    overrides: Partial<UpdateExceptionListItemSchema> = {}
  ): UpdateExceptionListItemSchemaWithNonNullProps {
    const {
      /* eslint-disable @typescript-eslint/naming-convention */
      description,
      entries,
      name,
      type,
      comments,
      id,
      item_id,
      meta,
      namespace_type,
      os_types,
      tags,
      _version,
      /* eslint-enable @typescript-eslint/naming-convention */
    } = this.generateTrustedApp();

    return {
      description,
      entries,
      name,
      type,
      comments,
      id,
      item_id,
      meta,
      namespace_type,
      os_types,
      tags,
      _version: _version ?? 'some value',
      ...overrides,
    };
  }

  generateEventFilter(overrides: Partial<ExceptionListItemSchema> = {}): ExceptionListItemSchema {
    const eventFilter = this.generate(overrides);

    return {
      ...eventFilter,
      name: `Event filter (${this.randomString(5)})`,
      list_id: ENDPOINT_EVENT_FILTERS_LIST_ID,
    };
  }

  generateEventFilterForCreate(
    overrides: Partial<CreateExceptionListItemSchema> = {}
  ): CreateExceptionListItemSchemaWithNonNullProps {
    const {
      /* eslint-disable @typescript-eslint/naming-convention */
      description,
      entries,
      list_id,
      name,
      type,
      comments,
      item_id,
      meta,
      namespace_type,
      os_types,
      tags,
      /* eslint-enable @typescript-eslint/naming-convention */
    } = this.generateEventFilter();
    return {
      description,
      entries,
      list_id,
      name,
      type,
      comments,
      item_id,
      meta,
      namespace_type,
      os_types,
      tags,
      ...overrides,
    };
  }

  generateEventFilterForUpdate(
    overrides: Partial<UpdateExceptionListItemSchema> = {}
  ): UpdateExceptionListItemSchemaWithNonNullProps {
    const {
      /* eslint-disable @typescript-eslint/naming-convention */
      description,
      entries,
      name,
      type,
      comments,
      id,
      item_id,
      meta,
      namespace_type,
      os_types,
      tags,
      _version,
      /* eslint-enable @typescript-eslint/naming-convention */
    } = this.generateEventFilter();
    return {
      description,
      entries,
      name,
      type,
      comments,
      id,
      item_id,
      meta,
      namespace_type,
      os_types,
      tags,
      _version: _version ?? 'some value',
      ...overrides,
    };
  }
}
