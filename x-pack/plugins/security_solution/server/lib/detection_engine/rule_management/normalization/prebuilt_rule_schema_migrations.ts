/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  Prebuilt,
  IsRuleImmutable,
} from '../../../../../common/api/detection_engine/model/rule_schema';
import type { BaseRuleParams, RuleParams } from '../../rule_schema';
import type { CreateAPIInput, PatchAPINextParams } from './rule_converters';

interface MigrationResponse {
  immutable: IsRuleImmutable;
  prebuilt?: Prebuilt;
}

const getPrebuiltValueForRuleRead = (ruleParams: BaseRuleParams): Prebuilt | undefined => {
  if (ruleParams.prebuilt) {
    return ruleParams.prebuilt;
  }

  if (ruleParams.immutable) {
    return {
      isCustomized: false,
    };
  }

  return undefined;
};

export const normalizePrebuiltSchemaOnRuleRead = (
  ruleParams: BaseRuleParams
): MigrationResponse => {
  const immutable = Boolean(ruleParams.prebuilt) || ruleParams.immutable;
  const prebuilt = getPrebuiltValueForRuleRead(ruleParams);

  return {
    immutable,
    prebuilt,
  };
};

interface PrebuiltSchemaCreationMigrationProps {
  input: CreateAPIInput;
  isRuleToCreatePrebuilt: boolean;
}

/**
 * Used when:
 * - Creating a custom rule (DETECTION_ENGINE_RULES_URL POST endpoint)
 * - Bulk creating custom rules (DETECTION_ENGINE_RULES_BULK_CREATE deprecated endpoint)
 * - Creating Prebuilt Rules (Installation)
 * - Updating a prebuilt rule when there is a type change (deletes and recreates the rule)
 * - Importing rules without overwriting an existing rule
 **/

const getPrebuiltValueForRuleCreation = (
  input: CreateAPIInput,
  isRuleToCreatePrebuilt: boolean
): Prebuilt | undefined => {
  if (!isRuleToCreatePrebuilt) {
    return undefined;
  }

  if (input.prebuilt != null) {
    return input.prebuilt;
  }

  return {
    isCustomized: false,
    elasticUpdateDate: input.elasticUpdateDate,
  };
};

export const migratePrebuiltSchemaOnRuleCreation = ({
  input,
  isRuleToCreatePrebuilt,
}: PrebuiltSchemaCreationMigrationProps): MigrationResponse => {
  const immutable = isRuleToCreatePrebuilt;
  const prebuilt = getPrebuiltValueForRuleCreation(input, isRuleToCreatePrebuilt);

  return {
    immutable,
    prebuilt,
  };
};

interface PrebuiltSchemaUpdateMigrationProps {
  nextParams?: PatchAPINextParams;
  existingParams: RuleParams;
  isRuleCustomizedDuringUpdate: boolean;
}

const getPrebuiltValueForRuleUpdate = ({
  nextParams,
  existingParams,
  isRuleCustomizedDuringUpdate,
}: PrebuiltSchemaUpdateMigrationProps): Prebuilt | undefined => {
  if (nextParams?.prebuilt) {
    return nextParams?.prebuilt;
  }

  if (existingParams.prebuilt) {
    return {
      ...existingParams.prebuilt,
      isCustomized: existingParams.prebuilt.isCustomized || isRuleCustomizedDuringUpdate,
    };
  }

  if (existingParams.immutable) {
    return {
      isCustomized: isRuleCustomizedDuringUpdate,
    };
  }

  return undefined;
};

/**
 * Used when:
 *  - Updating a prebuilt rule with no type change
 *  - Importing rules and overwriting an existing rule
 *  - Patching rules (DETECTION_ENGINE_RULES_URL patch endpoint --> managing shared exceptions lists)
 *  - Bulk Patching rules (deprecated DETECTION_ENGINE_RULES_BULK_UPDATE endpoint)
 *  - Creating rule exceptions (CREATE_RULE_EXCEPTIONS_URL endpoint)
 **/
export const migratePrebuiltSchemaOnRuleUpdate = ({
  nextParams,
  existingParams,
  isRuleCustomizedDuringUpdate,
}: PrebuiltSchemaUpdateMigrationProps): MigrationResponse => {
  const immutable = (Boolean(existingParams.prebuilt) || existingParams.immutable) ?? false;
  const prebuilt = getPrebuiltValueForRuleUpdate({
    nextParams,
    existingParams,
    isRuleCustomizedDuringUpdate,
  });

  return {
    immutable,
    prebuilt,
  };
};
