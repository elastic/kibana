/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ExceptionListItemSchema,
  CreateExceptionListItemSchema,
  ListOperator,
} from '@kbn/securitysolution-io-ts-list-types';
import { ENDPOINT_ARTIFACT_LISTS } from '@kbn/securitysolution-list-constants';
import { exceptionItemToCreateExceptionItem } from './exceptions_list_item_generator';
import { GLOBAL_ARTIFACT_TAG } from '../service/artifacts';
import { BaseDataGenerator } from './base_data_generator';

const ENTRY_FIELDS: readonly string[] = [
  // FIXME:PT use list of known/allowe fields for event filters (once I locate it)

  'dll.pe.imphash',
  'dll.pe.original_file_name',
  'dll.pe.product',
  'dns.Ext.options',
  'dns.Ext.status',
  'dns.question.name',
  'dns.question.registered_domain',
  'dns.question.subdomain',
  'dns.question.top_level_domain',
  'dns.question.type',
  'dns.resolved_ip',
  'ecs.version',
  'event.Ext.correlation.id',
  'event.action',
  'event.agent_id_status',
  'event.category',
  'event.code',
  'event.created',
  'event.dataset',
  'event.end',
  'event.hash',
  'event.id',
  'event.ingested',
  'event.kind',
  'event.module',
  'event.outcome',
  'event.provider',
  'event.sequence',
  'event.severity',
  'event.start',
  'event.type',
  'file.Ext.code_signature.exists',
  'file.Ext.code_signature.status',
  'file.Ext.code_signature.subject_name',
  'file.Ext.code_signature.trusted',
  'file.Ext.code_signature.valid',
  'file.Ext.device.bus_type',
  'file.Ext.device.dos_name',
  'file.Ext.device.file_system_type',
  'file.Ext.device.nt_name',
  'file.Ext.device.product_id',
  'file.Ext.device.serial_number',
  'file.Ext.device.vendor_id',
  'file.Ext.device.volume_device_type',
  'file.Ext.entropy',
  'file.Ext.header_bytes',
  'file.Ext.header_data',
  'file.Ext.malware_signature.all_names',
  'file.Ext.malware_signature.identifier',
  'file.Ext.malware_signature.primary.signature.hash.sha256',
  'file.Ext.malware_signature.primary.signature.id',
  'file.Ext.malware_signature.primary.signature.name',
  'file.Ext.malware_signature.version',
  'file.Ext.monotonic_id',
  'file.Ext.original.extension',
  'file.Ext.original.gid',
  'file.Ext.original.group',
  'file.Ext.original.mode',
  'file.Ext.original.name',
  'file.Ext.original.owner',
  'file.Ext.original.path',
  'file.Ext.original.uid',
  'file.Ext.windows.zone_identifier',
  'file.accessed',
  'file.attributes',
  'file.code_signature.exists',
  'file.code_signature.signing_id',
  'file.code_signature.status',
  'file.code_signature.subject_name',
  'file.code_signature.team_id',
  'file.code_signature.trusted',
  'file.code_signature.valid',
  'file.created',
  'file.ctime',
  'file.device',
  'file.directory',
  'file.drive_letter',
  'file.extension',
  'file.gid',
  'file.group',
  'file.hash.md5',
  'file.hash.sha1',
  'file.hash.sha256',
  'file.hash.sha512',
  'file.inode',
  'file.mime_type',
  'file.mode',
  'file.mtime',
  'file.name',
  'file.owner',
  'file.path',
  'file.path.caseless',
  'file.path.text',
  'file.pe.company',
  'file.pe.description',
  'file.pe.file_version',
  'file.pe.imphash',
  'file.pe.original_file_name',
  'file.pe.product',
  'file.size',
];

const ENTRY_OPERATORS: readonly ListOperator[] = ['included', 'excluded'];

export class EventFiltersGenerator extends BaseDataGenerator<ExceptionListItemSchema> {
  generate(overrides: Partial<ExceptionListItemSchema> = {}): ExceptionListItemSchema {
    return {
      id: this.seededUUIDv4(),
      item_id: this.seededUUIDv4(),
      list_id: ENDPOINT_ARTIFACT_LISTS.eventFilters.id,
      meta: undefined,
      name: `Event filter (${this.randomString(5)})`,
      description: `created by ${this.constructor.name}`,
      tags: [GLOBAL_ARTIFACT_TAG],
      entries: this.randomEventFilterEntries(),
      expire_time: undefined,
      namespace_type: 'agnostic',
      type: 'simple',
      os_types: [this.randomOSFamily()] as ExceptionListItemSchema['os_types'],
      tie_breaker_id: this.seededUUIDv4(),
      _version: this.randomString(5),
      comments: [],
      created_at: this.randomPastDate(),
      created_by: this.randomUser(),
      updated_at: '2020-04-20T15:25:31.830Z',
      updated_by: this.randomUser(),
      ...overrides,
    };
  }

  generateEventFilterForCreate(
    overrides: Partial<CreateExceptionListItemSchema> = {}
  ): CreateExceptionListItemSchema {
    return {
      ...exceptionItemToCreateExceptionItem(this.generate()),
      ...overrides,
    };
  }

  protected randomEventFilterEntries(
    count: number = this.randomN(5)
  ): ExceptionListItemSchema['entries'] {
    return Array.from({ length: count || 1 }, () => {
      if (this.randomBoolean()) {
        // single entry
        return {
          field: this.randomChoice(ENTRY_FIELDS),
          operator: this.randomChoice(ENTRY_OPERATORS),
          type: 'match',
          value: this.randomString(10),
        };
      } else {
        // nested entry
        return {
          field: this.randomChoice(ENTRY_FIELDS),
          type: 'nested',
          entries: [
            {
              field: this.randomChoice(ENTRY_FIELDS),
              operator: this.randomChoice(ENTRY_OPERATORS),
              type: 'match',
              value: this.randomString(10),
            },
          ],
        };
      }
    });
  }
}
