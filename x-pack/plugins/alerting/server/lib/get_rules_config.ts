/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { omit } from 'lodash';
import { Logger } from 'kibana/server';
import { RulesConfig, RuleTypeConfig, RuleTypeConfigFromOriginPlugin } from '../config';
import { validateDurationSchema } from '../../common';
import { translations } from '../constants/translations';

const DEFAULT_EXECUTION_TIMEOUT = '5m';

export const getExecutionConfigForRuleType = ({
  config,
  configFromOriginPlugin,
  ruleTypeId,
  logger,
}: {
  config: RulesConfig;
  configFromOriginPlugin?: RuleTypeConfigFromOriginPlugin;
  ruleTypeId: string;
  logger: Logger;
}): RuleTypeConfig => {
  const ruleTypeConfig = config.execution.ruleTypeOverrides?.find(
    (ruleType) => ruleType.id === ruleTypeId
  );

  // validate timeout from rule type registry here
  let timeout = config.execution.timeout || DEFAULT_EXECUTION_TIMEOUT;

  if (configFromOriginPlugin?.execution.timeout) {
    const invalidTimeout = validateDurationSchema(configFromOriginPlugin?.execution.timeout);
    if (!invalidTimeout) {
      timeout = configFromOriginPlugin?.execution.timeout;
    } else {
      logger.error(
        translations.ruleTypeRegistry.register.invalidTimeoutRuleTypeError({
          id: ruleTypeId,
          errorMessage: invalidTimeout,
        })
      );
    }
  }

  return {
    execution: {
      ...omit(config.execution, 'ruleTypeOverrides'),
      timeout,
      ...omit(ruleTypeConfig, 'id'),
    },
  };
};
