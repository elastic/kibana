/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ENDPOINT_BLOCKLISTS_LIST_ID } from '@kbn/securitysolution-list-constants';
import { schema, TypeOf } from '@kbn/config-schema';
import { ExceptionListItemSchema } from '@kbn/securitysolution-io-ts-list-types';
import { OperatingSystem } from '@kbn/securitysolution-utils';
import { BaseValidator } from './base_validator';
import { ExceptionItemLikeOptions } from '../types';
import {
  CreateExceptionListItemOptions,
  UpdateExceptionListItemOptions,
} from '../../../../../lists/server';
import { isValidHash } from '../../../../common/endpoint/service/trusted_apps/validations';
import { EndpointArtifactExceptionValidationError } from './errors';

const FileHashField = schema.oneOf([
  schema.literal('file.hash.md5'),
  schema.literal('file.hash.sha1'),
  schema.literal('file.hash.sha256'),
]);
const FileExecutablePath = schema.literal('file.executable.caseless');
const FileCodeSigner = schema.literal('file.Ext.code_signature');

const ConditionEntryTypeSchema = schema.literal('match_any');
const ConditionEntryOperatorSchema = schema.literal('included');

type ConditionEntryFieldAllowedType =
  | TypeOf<typeof FileHashField>
  | TypeOf<typeof FileExecutablePath>
  | TypeOf<typeof FileCodeSigner>;

type BlocklistConditionEntry =
  | {
      field: ConditionEntryFieldAllowedType;
      type: 'match_any';
      operator: 'included';
      value: string[];
    }
  | TypeOf<typeof WindowsSignerEntrySchema>;

/*
 * A generic Entry schema to be used for a specific entry schema depending on the OS
 */
const CommonEntrySchema = {
  field: schema.oneOf([FileHashField, FileExecutablePath]),
  type: ConditionEntryTypeSchema,
  operator: ConditionEntryOperatorSchema,
  // If field === HASH then validate hash with custom method, else validate string with minLength = 1
  value: schema.conditional(
    schema.siblingRef('field'),
    FileHashField,
    schema.arrayOf(
      schema.string({
        validate: (hash: string) =>
          isValidHash(hash) ? undefined : `invalid hash value [${hash}]`,
      })
    ),
    schema.conditional(
      schema.siblingRef('field'),
      FileExecutablePath,
      schema.arrayOf(
        schema.string({
          validate: (pathValue: string) =>
            pathValue.length > 0 ? undefined : `invalid path value [${pathValue}]`,
        })
      ),
      schema.arrayOf(
        schema.string({
          validate: (signerValue: string) =>
            signerValue.length > 0 ? undefined : `invalid signer value [${signerValue}]`,
        })
      )
    )
  ),
};

// Windows Signer entries use a Nested field that checks to ensure
// that the certificate is trusted
const WindowsSignerEntrySchema = schema.object({
  type: schema.literal('nested'),
  field: FileCodeSigner,
  entries: schema.arrayOf(
    schema.object({
      field: schema.literal('subject_name'),
      value: schema.arrayOf(schema.string({ minLength: 1 })),
      type: schema.literal('match_any'),
      operator: schema.literal('included'),
    })
  ),
});

const WindowsEntrySchema = schema.oneOf([
  WindowsSignerEntrySchema,
  schema.object({
    ...CommonEntrySchema,
    field: schema.oneOf([FileHashField, FileExecutablePath]),
  }),
]);

const LinuxEntrySchema = schema.object({
  ...CommonEntrySchema,
});

const MacEntrySchema = schema.object({
  ...CommonEntrySchema,
});

// Hash entries validator method.
const hashEntriesValidation = (entries: BlocklistConditionEntry[], allowedHashes: string[]) => {
  const currentHashes = entries.map((entry) => entry.field);
  // If there are more hashes than allowed (three) then return an error
  if (currentHashes.length > allowedHashes.length) {
    const allowedHashesMessage = allowedHashes
      .map((hash) => hash.replace('file.hash.', ''))
      .join(',');
    return `There are more hash types than allowed [${allowedHashesMessage}]`;
  }

  const hashesCount: { [key: string]: boolean } = {};
  const duplicatedHashes: string[] = [];
  const invalidHash: string[] = [];

  // Check hash entries individually
  currentHashes.forEach((hash) => {
    if (!allowedHashes.includes(hash)) invalidHash.push(hash);
    if (hashesCount[hash]) {
      duplicatedHashes.push(hash);
    } else {
      hashesCount[hash] = true;
    }
  });

  // There is more than one entry with the same hash type
  if (duplicatedHashes.length) {
    return `There are some duplicated hashes: ${duplicatedHashes.join(',')}`;
  }

  // There is an entry with an invalid hash type
  if (invalidHash.length) {
    return `There are some invalid fields for hash type: ${invalidHash.join(',')}`;
  }
};

// Validate there is only one entry when signer or path and the allowed entries for hashes
const entriesSchemaOptions = {
  minSize: 1,
  validate(entries: BlocklistConditionEntry[]) {
    const allowedHashes = ['file.hash.md5', 'file.hash.sha1', 'file.hash.sha256'];
    if (allowedHashes.includes(entries[0].field)) {
      return hashEntriesValidation(entries, allowedHashes);
    } else {
      if (entries.length > 1) {
        return 'Only one entry is allowed when no using hash field type';
      }
    }
  },
};

/*
 * Entities array schema depending on Os type using schema.conditional.
 * If OS === WINDOWS then use Windows schema,
 * else if OS === LINUX then use Linux schema,
 * else use Mac schema
 *
 * The validate function checks there is only one item for entries excepts for hash
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
 * Schema to validate Blocklist data for create and update.
 * When called, it must be given an `context` with a `os` property set
 *
 * @example
 *
 * BlocklistDataSchema.validate(item, { os: 'windows' });
 */
const BlocklistDataSchema = schema.object(
  {
    entries: EntriesSchema,
  },

  // Because we are only validating some fields from the Exception Item, we set `unknowns` to `ignore` here
  { unknowns: 'ignore' }
);

export class BlocklistValidator extends BaseValidator {
  static isBlocklist(item: { listId: string }): boolean {
    return item.listId === ENDPOINT_BLOCKLISTS_LIST_ID;
  }

  async validatePreCreateItem(
    item: CreateExceptionListItemOptions
  ): Promise<CreateExceptionListItemOptions> {
    await this.validateCanManageEndpointArtifacts();
    await this.validateBlocklistData(item);
    await this.validateCanCreateByPolicyArtifacts(item);
    await this.validateByPolicyItem(item);

    return item;
  }

  async validatePreDeleteItem(): Promise<void> {
    await this.validateCanManageEndpointArtifacts();
  }

  async validatePreGetOneItem(): Promise<void> {
    await this.validateCanManageEndpointArtifacts();
  }

  async validatePreMultiListFind(): Promise<void> {
    await this.validateCanManageEndpointArtifacts();
  }

  async validatePreExport(): Promise<void> {
    await this.validateCanManageEndpointArtifacts();
  }

  async validatePreSingleListFind(): Promise<void> {
    await this.validateCanManageEndpointArtifacts();
  }

  async validatePreGetListSummary(): Promise<void> {
    await this.validateCanManageEndpointArtifacts();
  }

  async validatePreUpdateItem(
    _updatedItem: UpdateExceptionListItemOptions,
    currentItem: ExceptionListItemSchema
  ): Promise<UpdateExceptionListItemOptions> {
    const updatedItem = _updatedItem as ExceptionItemLikeOptions;

    await this.validateCanManageEndpointArtifacts();
    await this.validateBlocklistData(updatedItem);

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

  private async validateBlocklistData(item: ExceptionItemLikeOptions): Promise<void> {
    await this.validateBasicData(item);

    try {
      BlocklistDataSchema.validate(item, { os: item.osTypes[0] });
    } catch (error) {
      throw new EndpointArtifactExceptionValidationError(error.message);
    }
  }
}
