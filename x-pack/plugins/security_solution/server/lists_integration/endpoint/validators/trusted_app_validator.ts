/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ENDPOINT_TRUSTED_APPS_LIST_ID } from '@kbn/securitysolution-list-constants';
import { schema } from '@kbn/config-schema';
import { ExceptionListItemSchema } from '@kbn/securitysolution-io-ts-list-types';
import { BaseValidator } from './base_validator';
import { ExceptionItemLikeOptions } from '../types';
import {
  CreateExceptionListItemOptions,
  UpdateExceptionListItemOptions,
} from '../../../../../lists/server';
import {
  ConditionEntry,
  ConditionEntryField,
  OperatingSystem,
} from '../../../../common/endpoint/types';
import {
  getDuplicateFields,
  isValidHash,
} from '../../../../common/endpoint/service/trusted_apps/validations';

const ProcessHashField = schema.oneOf([
  schema.literal('process.hash.md5'),
  schema.literal('process.hash.sha1'),
  schema.literal('process.hash.sha256'),
]);
const ProcessExecutablePath = schema.literal('process.executable.caseless');
const ProcessCodeSigner = schema.literal('process.Ext.code_signature');

const ConditionEntryTypeSchema = schema.conditional(
  schema.siblingRef('field'),
  ProcessExecutablePath,
  schema.oneOf([schema.literal('match'), schema.literal('wildcard')]),
  schema.literal('match')
);
const ConditionEntryOperatorSchema = schema.literal('included');

/*
 * A generic Entry schema to be used for a specific entry schema depending on the OS
 */
const CommonEntrySchema = {
  field: schema.oneOf([ProcessHashField, ProcessExecutablePath]),
  type: ConditionEntryTypeSchema,
  operator: ConditionEntryOperatorSchema,
  // If field === HASH then validate hash with custom method, else validate string with minLength = 1
  value: schema.conditional(
    schema.siblingRef('field'),
    ProcessHashField,
    schema.string({
      validate: (hash: string) =>
        isValidHash(hash) ? undefined : `invalidField.${ConditionEntryField.HASH}`,
    }),
    schema.conditional(
      schema.siblingRef('field'),
      ProcessExecutablePath,
      schema.string({
        validate: (field: string) =>
          field.length > 0 ? undefined : `invalidField.${ConditionEntryField.PATH}`,
      }),
      schema.string({
        validate: (field: string) =>
          field.length > 0 ? undefined : `invalidField.${ConditionEntryField.SIGNER}`,
      })
    )
  ),
};

const WindowsEntrySchema = schema.object({
  ...CommonEntrySchema,
  field: schema.oneOf([
    schema.oneOf([
      schema.literal('process.hash.md5'),
      schema.literal('process.hash.sha1'),
      schema.literal('process.hash.sha256'),
    ]),
    ProcessExecutablePath,
    ProcessCodeSigner,
  ]),
});

const LinuxEntrySchema = schema.object({
  ...CommonEntrySchema,
});

const MacEntrySchema = schema.object({
  ...CommonEntrySchema,
});

const entriesSchemaOptions = {
  minSize: 1,
  validate(entries: ConditionEntry[]) {
    const dups = getDuplicateFields(entries);
    return dups.map((field) => `duplicatedEntry.${field}`).join(', ') || undefined;
  },
};

/*
 * Entities array schema depending on Os type using schema.conditional.
 * If OS === WINDOWS then use Windows schema,
 * else if OS === LINUX then use Linux schema,
 * else use Mac schema
 *
 * The validate function checks there is no duplicated entry inside the array
 */
const EntriesSchema = schema.conditional(
  schema.contextRef('os'),
  OperatingSystem.WINDOWS,
  schema.arrayOf(WindowsEntrySchema, entriesSchemaOptions),
  schema.conditional(
    schema.contextRef('os'),
    OperatingSystem.LINUX,
    schema.arrayOf(LinuxEntrySchema, entriesSchemaOptions),
    schema.arrayOf(MacEntrySchema, entriesSchemaOptions)
  )
);

/**
 * Schema to validate Trusted Apps data for create and update.
 * When called, it must be given an `context` with a `os` property set
 *
 * @example
 *
 * TrustedAppDataSchema.validate(item, { os: 'windows' });
 */
const TrustedAppDataSchema = schema.object(
  {
    entries: EntriesSchema,
  },

  // Because we are only validating some fields from the Exception Item, we set `unknowns` to `ignore` here
  { unknowns: 'ignore' }
);

export class TrustedAppValidator extends BaseValidator {
  static isTrustedApp(item: { listId: string }): boolean {
    return item.listId === ENDPOINT_TRUSTED_APPS_LIST_ID;
  }

  async validatePreCreateItem(
    item: CreateExceptionListItemOptions
  ): Promise<CreateExceptionListItemOptions> {
    await this.validateCanManageEndpointArtifacts();
    await this.validateTrustedAppData(item);
    await this.validateCanCreateByPolicyArtifacts(item);
    await this.validateByPolicyItem(item);

    return item;
  }

  async validatePreUpdateItem(
    _updatedItem: UpdateExceptionListItemOptions,
    currentItem: ExceptionListItemSchema
  ): Promise<UpdateExceptionListItemOptions> {
    const updatedItem = _updatedItem as ExceptionItemLikeOptions;

    await this.validateCanManageEndpointArtifacts();
    await this.validateTrustedAppData(updatedItem);

    try {
      await this.validateCanCreateByPolicyArtifacts(updatedItem);
    } catch (noByPolicyAuthzError) {
      // Not allowed to create/update by policy data. Validate that the effective scope of the item
      // remained unchanged with this update or was set to `global` (only allowed update). If not,
      // then throw the validation error that was catch'ed
      if (this.wasByPolicyEffectScopeChanged(updatedItem, currentItem)) {
        throw noByPolicyAuthzError;
      }
    }

    await this.validateByPolicyItem(updatedItem);

    return updatedItem as UpdateExceptionListItemOptions;
  }

  private async validateTrustedAppData(item: ExceptionItemLikeOptions): Promise<void> {
    await this.validateBasicData(item);
    TrustedAppDataSchema.validate(item, { os: item.osTypes[0] });
  }
}
