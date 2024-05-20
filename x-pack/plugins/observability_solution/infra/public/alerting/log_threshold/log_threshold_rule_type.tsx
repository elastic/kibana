/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { UrlService } from '@kbn/share-plugin/common/url_service';
import { getLogsLocatorsFromUrlService } from '@kbn/logs-shared-plugin/common';
import { ObservabilityRuleTypeModel } from '@kbn/observability-plugin/public';
import {
  LOG_DOCUMENT_COUNT_RULE_TYPE_ID,
  PartialRuleParams,
} from '../../../common/alerting/logs/log_threshold';
import { createLazyComponentWithKibanaContext } from '../../hooks/use_kibana';
import { InfraClientCoreSetup } from '../../types';
import { createRuleFormatter } from './rule_data_formatters';
import { validateExpression } from './validation';

const logThresholdDefaultActionMessage = i18n.translate(
  'xpack.infra.logs.alerting.threshold.defaultActionMessage',
  {
    defaultMessage: `\\{\\{context.reason\\}\\}

\\{\\{rule.name\\}\\} is active.

\\{\\{^context.isRatio\\}\\}\\{\\{#context.group\\}\\}\\{\\{context.group\\}\\} - \\{\\{/context.group\\}\\}\\{\\{context.matchingDocuments\\}\\} log entries have matched the following conditions: \\{\\{context.conditions\\}\\}\\{\\{/context.isRatio\\}\\}
\\{\\{#context.isRatio\\}\\}\\{\\{#context.group\\}\\}\\{\\{context.group\\}\\} - \\{\\{/context.group\\}\\} Ratio of the count of log entries matching \\{\\{context.numeratorConditions\\}\\} to the count of log entries matching \\{\\{context.denominatorConditions\\}\\} was \\{\\{context.ratio\\}\\}\\{\\{/context.isRatio\\}\\}

[View alert details](\\{\\{context.alertDetailsUrl\\}\\})
`,
  }
);
const logThresholdDefaultRecoveryMessage = i18n.translate(
  'xpack.infra.logs.alerting.threshold.defaultRecoveryMessage',
  {
    defaultMessage: `\\{\\{rule.name\\}\\} has recovered.

[View alert details](\\{\\{context.alertDetailsUrl\\}\\})
`,
  }
);

export function createLogThresholdRuleType(
  core: InfraClientCoreSetup,
  urlService: UrlService
): ObservabilityRuleTypeModel<PartialRuleParams> {
  const ruleParamsExpression = createLazyComponentWithKibanaContext(
    core,
    () => import('./components/expression_editor/editor')
  );

  const alertDetailsAppSection = createLazyComponentWithKibanaContext(
    core,
    () => import('./components/alert_details_app_section')
  );

  const { logsLocator } = getLogsLocatorsFromUrlService(urlService);

  return {
    id: LOG_DOCUMENT_COUNT_RULE_TYPE_ID,
    description: i18n.translate('xpack.infra.logs.alertFlyout.alertDescription', {
      defaultMessage: 'Alert when the log aggregation exceeds the threshold.',
    }),
    iconClass: 'bell',
    documentationUrl(docLinks) {
      return `${docLinks.links.observability.logsThreshold}`;
    },
    alertDetailsAppSection,
    ruleParamsExpression,
    validate: validateExpression,
    defaultActionMessage: logThresholdDefaultActionMessage,
    defaultRecoveryMessage: logThresholdDefaultRecoveryMessage,
    requiresAppContext: false,
    format: createRuleFormatter(logsLocator),
    priority: 30,
  };
}
