/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

import { HttpLogic } from '../../../../../../shared/http';

import {
  CrawlerDomainValidationResultChange,
  CrawlerDomainValidationResultFromServer,
  CrawlerDomainValidationStep,
  CrawlerDomainValidationStepName,
  CrawlerDomainValidationStepState,
} from './types';

export const extractDomainAndEntryPointFromUrl = (
  url: string
): { domain: string; entryPoint: string } => {
  let domain = url;
  let entryPoint = '/';

  const pathSlashIndex = url.search(/[^\:\/]\//);
  if (pathSlashIndex !== -1) {
    domain = url.substring(0, pathSlashIndex + 1);
    entryPoint = url.substring(pathSlashIndex + 1);
  }

  return { domain, entryPoint };
};

export const getDomainWithProtocol = async (domain: string) => {
  const { http } = HttpLogic.values;

  if (!domain.startsWith('https://') && !domain.startsWith('http://')) {
    try {
      const route = '/internal/enterprise_search/crawler/validate_url';
      const checks = ['tcp', 'url_request'];

      const httpsCheckData: CrawlerDomainValidationResultFromServer = await http.post(route, {
        body: JSON.stringify({ checks, url: `https://${domain}` }),
      });
      if (httpsCheckData.valid) {
        return `https://${domain}`;
      }

      const httpCheckData: CrawlerDomainValidationResultFromServer = await http.post(route, {
        body: JSON.stringify({ checks, url: `http://${domain}` }),
      });
      if (httpCheckData.valid) {
        return `http://${domain}`;
      }
    } catch (error) {
      // Do nothing as later validation steps will catch errors
    }
  }

  return domain;
};

export const domainValidationStateToPanelColor = (
  state: CrawlerDomainValidationStepState
): 'success' | 'warning' | 'danger' | 'subdued' => {
  switch (state) {
    case 'valid':
      return 'success';
    case 'warning':
      return 'warning';
    case 'invalid':
      return 'danger';
    default:
      return 'subdued';
  }
};

const allFailureResultChanges: CrawlerDomainValidationResultChange = {
  contentVerification: {
    message: i18n.translate(
      'xpack.enterpriseSearch.crawler.addDomainForm.contentVerificationFailureMessage',
      {
        defaultMessage:
          'Unable to verify content because the "Indexing restrictions" check failed.',
      }
    ),
    state: 'invalid',
  },
  indexingRestrictions: {
    message: i18n.translate(
      'xpack.enterpriseSearch.crawler.addDomainForm.indexingRestrictionsFailureMessage',
      {
        defaultMessage:
          'Unable to determine indexing restrictions because the "Network connectivity" check failed.',
      }
    ),
    state: 'invalid',
  },
  networkConnectivity: {
    message: i18n.translate(
      'xpack.enterpriseSearch.crawler.addDomainForm.networkConnectivityFailureMessage',
      {
        defaultMessage:
          'Unable to establish a network connection because the "Initial validation" check failed.',
      }
    ),
    state: 'invalid',
  },
};

export const domainValidationFailureResultChange = (
  stepName: CrawlerDomainValidationStepName
): CrawlerDomainValidationResultChange => {
  switch (stepName) {
    case 'initialValidation':
      return allFailureResultChanges;
    case 'networkConnectivity':
      return {
        contentVerification: allFailureResultChanges.contentVerification,
        indexingRestrictions: allFailureResultChanges.indexingRestrictions,
      };
    case 'indexingRestrictions':
      return {
        contentVerification: allFailureResultChanges.contentVerification,
      };
    default:
      return {};
  }
};

export function crawlDomainValidationToResult(
  data: CrawlerDomainValidationResultFromServer
): CrawlerDomainValidationStep {
  if (!data.valid) {
    return {
      blockingFailure: true,
      message: data.results.find((result) => result.result === 'failure')?.comment,
      state: 'invalid',
    };
  }

  const warningResult = data.results.find((result) => result.result === 'warning');

  if (warningResult) {
    return {
      blockingFailure: !data.valid,
      message: warningResult.comment,
      state: 'warning',
    };
  }

  return {
    state: 'valid',
  };
}
