/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const CONNECTOR_NEEDED = i18n.translate(
  'xpack.securitySolution.aiRuleMonitoring.connectorNeeded',
  {
    defaultMessage:
      'To be able to use Gen AI assisted Rule Monitoring you need to configure an Generative AI Connector. The connector will be shared with AI Assistant.',
  }
);

export const WELCOME_GENERAL_INFO = i18n.translate(
  'xpack.securitySolution.aiRuleMonitoring.connectorNeeded',
  {
    defaultMessage:
      'AI Rule Monitoring is a Generative AI tool to help you analyze Rule Monitoring data collected for your running rules. It might be challenging to analyze Detection Rule Monitoring dashboard or dig deep into rule execution logs to get insight on what is wrong.',
  }
);

export const WELCOME_EXPLANATION = i18n.translate(
  'xpack.securitySolution.aiRuleMonitoring.connectorNeeded',
  {
    defaultMessage:
      'We prepare rule monitoring data to be analyzed by AI of your choice. It helps to get insight on your current cluster health and spot potential problems impacting your protection if some rules are not running correctly.',
  }
);

export const WELCOME_ACTION = i18n.translate(
  'xpack.securitySolution.aiRuleMonitoring.connectorNeeded',
  {
    defaultMessage:
      'Nothing is processed without your explicit concern. To perform analysis select a desired time range you want to analyze and press "Analyze" button.',
  }
);
