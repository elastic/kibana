/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { omit, pick } from 'lodash';
import {
  ElasticsearchClient,
  SavedObjectsClient,
  SavedObjectsErrorHelpers,
  SavedObjectsUpdateOptions,
} from '@kbn/core/server';
import { decodeRequestVersion } from '@kbn/core-saved-objects-base-server-internal';
import { ALERTING_CASES_SAVED_OBJECT_INDEX } from '@kbn/core-saved-objects-server';
import { RawRule } from '../types';

import {
  RuleAttributesToEncrypt,
  RuleAttributesIncludedInAAD,
  RuleAttributesNotPartiallyUpdatable,
  RULE_SAVED_OBJECT_TYPE,
} from '.';
import { RuleAttributes } from '../data/rule/types';

// We have calling code that references both RawRule and RuleAttributes,
// so we need to support both of these types (they are effectively the same)
export type PartiallyUpdateableRuleAttributes = Partial<
  | Omit<RawRule, RuleAttributesNotPartiallyUpdatable>
  | Omit<RuleAttributes, RuleAttributesNotPartiallyUpdatable>
>;

interface PartiallyUpdateRuleSavedObjectOptions {
  refresh?: SavedObjectsUpdateOptions['refresh'];
  version?: string;
  ignore404?: boolean;
  namespace?: string; // only should be used  with ISavedObjectsRepository
}

// typed this way so we can send a SavedObjectClient or SavedObjectRepository
type SavedObjectClientForUpdate = Pick<SavedObjectsClient, 'update'>;

// direct, partial update to a rule saved object via scoped SavedObjectsClient
// using namespace set in the client
export async function partiallyUpdateRule(
  savedObjectsClient: SavedObjectClientForUpdate,
  id: string,
  attributes: PartiallyUpdateableRuleAttributes,
  options: PartiallyUpdateRuleSavedObjectOptions = {}
): Promise<void> {
  // ensure we only have the valid attributes that are not encrypted and are excluded from AAD
  const attributeUpdates = omit(attributes, [
    ...RuleAttributesToEncrypt,
    ...RuleAttributesIncludedInAAD,
  ]);
  const updateOptions: SavedObjectsUpdateOptions<RuleAttributes> = pick(
    options,
    'namespace',
    'version',
    'refresh'
  );

  try {
    await savedObjectsClient.update(RULE_SAVED_OBJECT_TYPE, id, attributeUpdates, updateOptions);
  } catch (err) {
    if (options?.ignore404 && SavedObjectsErrorHelpers.isNotFoundError(err)) {
      return;
    }
    throw err;
  }
}

// direct, partial update to a rule saved object via ElasticsearchClient
// using namespace set in the client
export async function partiallyUpdateRuleWithEs(
  esClient: ElasticsearchClient,
  id: string,
  attributes: PartiallyUpdateableRuleAttributes,
  options: PartiallyUpdateRuleSavedObjectOptions = {}
): Promise<void> {
  // ensure we only have the valid attributes that are not encrypted and are excluded from AAD
  const attributeUpdates = omit(attributes, [
    ...RuleAttributesToEncrypt,
    ...RuleAttributesIncludedInAAD,
  ]);

  const updateParams = {
    id: `alert:${id}`,
    index: ALERTING_CASES_SAVED_OBJECT_INDEX,
    ...(options.version ? decodeRequestVersion(options.version) : {}),
    doc: {
      alert: attributeUpdates,
    },
    ...(options.refresh ? { refresh: options.refresh } : {}),
  };

  if (options.ignore404) {
    await esClient.update(updateParams, { ignore: [404] });
  } else {
    await esClient.update(updateParams);
  }
}
