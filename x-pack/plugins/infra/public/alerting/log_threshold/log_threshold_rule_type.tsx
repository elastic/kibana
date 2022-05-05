/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { ObservabilityRuleTypeModel } from '@kbn/observability-plugin/public';
import {
  LOG_DOCUMENT_COUNT_RULE_TYPE_ID,
  PartialRuleParams,
} from '../../../common/alerting/logs/log_threshold';
import { createLazyComponentWithKibanaContext } from '../../hooks/use_kibana';
import { InfraClientCoreSetup } from '../../types';
import { formatRuleData } from './rule_data_formatters';
import { validateExpression } from './validation';

export function createLogThresholdRuleType(
  core: InfraClientCoreSetup
): ObservabilityRuleTypeModel<PartialRuleParams> {
  const ruleParamsExpression = createLazyComponentWithKibanaContext(
    core,
    () => import('./components/expression_editor/editor')
  );

  return {
    id: LOG_DOCUMENT_COUNT_RULE_TYPE_ID,
    description: i18n.translate('xpack.infra.logs.alertFlyout.alertDescription', {
      defaultMessage: 'Alert when the log aggregation exceeds the threshold.',
    }),
    iconClass: 'bell',
    documentationUrl(docLinks) {
      return `${docLinks.links.observability.logsThreshold}`;
    },
    ruleParamsExpression,
    validate: validateExpression,
    defaultActionMessage: i18n.translate(
      'xpack.infra.logs.alerting.threshold.defaultActionMessage',
      {
        defaultMessage: `\\{\\{^context.isRatio\\}\\}\\{\\{#context.group\\}\\}\\{\\{context.group\\}\\} - \\{\\{/context.group\\}\\}\\{\\{context.matchingDocuments\\}\\} log entries have matched the following conditions: \\{\\{context.conditions\\}\\}\\{\\{/context.isRatio\\}\\}\\{\\{#context.isRatio\\}\\}\\{\\{#context.group\\}\\}\\{\\{context.group\\}\\} - \\{\\{/context.group\\}\\} Ratio of the count of log entries matching \\{\\{context.numeratorConditions\\}\\} to the count of log entries matching \\{\\{context.denominatorConditions\\}\\} was \\{\\{context.ratio\\}\\}\\{\\{/context.isRatio\\}\\}`,
      }
    ),
    requiresAppContext: false,
    format: formatRuleData,
  };
}
