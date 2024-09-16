/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { promises as fs } from 'fs';
import path from 'path';
import { validatePrebuiltRuleAsset } from './prebuilt_rule_assets_validation';
import type { PrebuiltRuleAsset } from '../../model/rule_assets/prebuilt_rule_asset';

const PREBUILT_RULES_DIR = path.join(__dirname, '..', '..', 'local_rules');

export async function readPrebuiltRulesFromFolder(): Promise<Map<string, PrebuiltRuleAsset>> {
  const rulesMap = new Map<string, PrebuiltRuleAsset>();
  const files = await fs.readdir(PREBUILT_RULES_DIR);

  for (const file of files) {
    if (path.extname(file) === '.json') {
      const filePath = path.join(PREBUILT_RULES_DIR, file);
      const fileContent = await fs.readFile(filePath, 'utf8');
      try {
        const jsonContent = JSON.parse(fileContent);
        const validatedRule = validatePrebuiltRuleAsset(jsonContent);
        rulesMap.set(path.basename(file, '.json'), validatedRule);
      } catch (error) {
        throw new Error(`Error validating rule asset file ${file}: ${error}`);
      }
    }
  }

  return rulesMap;
}
