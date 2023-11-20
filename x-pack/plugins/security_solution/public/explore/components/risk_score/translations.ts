/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { RiskScoreEntity } from '../../../../common/search_strategy';

export const HOST = i18n.translate('xpack.securitySolution.riskScore.overview.hostTitle', {
  defaultMessage: 'Host',
});

export const HOSTS = i18n.translate('xpack.securitySolution.riskScore.overview.hosts', {
  defaultMessage: 'Hosts',
});

export const USER = i18n.translate('xpack.securitySolution.riskScore.overview.userTitle', {
  defaultMessage: 'User',
});

export const USERS = i18n.translate('xpack.securitySolution.riskScore.overview.users', {
  defaultMessage: 'Users',
});

export const ENTITY = i18n.translate('xpack.securitySolution.riskScore.overview.entityTitle', {
  defaultMessage: 'Entity',
});

export const ENTITIES = i18n.translate('xpack.securitySolution.riskScore.overview.entities', {
  defaultMessage: 'Entities',
});

export const RISK_SCORE_TITLE = (riskEntity: RiskScoreEntity) =>
  i18n.translate('xpack.securitySolution.riskScore.overview.riskScoreTitle', {
    defaultMessage: '{riskEntity} Risk Score',
    values: {
      riskEntity: getRiskEntityTranslation(riskEntity),
    },
  });

export const ENTITY_RISK_LEVEL = (riskEntity: RiskScoreEntity) =>
  i18n.translate('xpack.securitySolution.entityAnalytics.riskDashboard.riskLevelTitle', {
    defaultMessage: '{riskEntity} risk level',
    values: {
      riskEntity: getRiskEntityTranslation(riskEntity),
    },
  });

export const getRiskEntityTranslation = (
  riskEntity?: RiskScoreEntity,
  lowercase = false,
  plural = false
) => {
  const text = getRiskEntityTranslationText(riskEntity, plural);
  return lowercase ? text.toLowerCase() : text;
};

export const getRiskEntityTranslationText = (
  riskEntity: RiskScoreEntity | undefined,
  plural: boolean
) => {
  if (riskEntity === RiskScoreEntity.host && plural) return HOSTS;
  if (riskEntity === RiskScoreEntity.host) return HOST;

  if (riskEntity === RiskScoreEntity.user && plural) return USERS;
  if (riskEntity === RiskScoreEntity.user) return USER;

  if (plural) return ENTITIES;
  return ENTITY;
};

export const ALERTS = i18n.translate('xpack.securitySolution.riskScore.overview.alerts', {
  defaultMessage: 'Alerts',
});
