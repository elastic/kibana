/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  SharedCreateProps,
  TypeSpecificCreatePropsInternal,
} from '../../../../../../common/api/detection_engine';
import { type PrebuiltRuleAsset } from '../../model/rule_assets/prebuilt_rule_asset';

function createRuleTypeToCreateRulePropsMap() {
  // SharedCreateProps is an extension of BaseCreateProps, but includes rule_id
  const baseFields = Object.keys(SharedCreateProps.shape);

  return new Map(
    TypeSpecificCreatePropsInternal.options.map((option) => {
      const typeName = option.shape.type.value;
      const typeSpecificFieldsForType = Object.keys(option.shape);

      return [typeName, [...baseFields, ...typeSpecificFieldsForType] as [keyof PrebuiltRuleAsset]];
    })
  );
}

/**
 * Map of the CreateProps field names, by rule type.
 *
 * Helps creating the payload to be passed to the `upgradePrebuiltRules()` method during the
 * Upgrade workflow (`/upgrade/_perform` endpoint)
 *
 * Creating this Map dynamically, based on BaseCreateProps and TypeSpecificFields, ensures that we don't need to:
 *  - manually add rule types to this Map if they are created
 *  - manually add or remove any fields if they are added or removed to a specific rule type
 *  - manually add or remove any fields if we decide that they should not be part of the upgradable fields.
 *
 * Notice that this Map includes, for each rule type, all fields that are part of the BaseCreateProps and all fields that
 * are part of the TypeSpecificFields, including those that are not part of RuleUpgradeSpecifierFields schema, where
 * the user of the /upgrade/_perform endpoint can specify which fields to upgrade during the upgrade workflow.
 */
export const FIELD_NAMES_BY_RULE_TYPE_MAP = createRuleTypeToCreateRulePropsMap();
