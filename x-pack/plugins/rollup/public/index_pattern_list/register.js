/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IndexPatternListConfigRegistry } from 'ui/management/index_pattern_list';
import { RollupIndexPatternListConfig } from './rollup_index_pattern_list_config';

export function initIndexPatternList() {
  IndexPatternListConfigRegistry.register(() => RollupIndexPatternListConfig);
}
