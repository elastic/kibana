/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

import {
  CrawlerDomain,
  CrawlerDomainFromServer,
  CrawlerData,
  CrawlerDataFromServer,
  CrawlerDomainValidationResultFromServer,
  CrawlerDomainValidationStep,
  CrawlRequestFromServer,
  CrawlRequest,
} from './types';

export function crawlerDomainServerToClient(payload: CrawlerDomainFromServer): CrawlerDomain {
  const {
    id,
    name,
    sitemaps,
    created_on: createdOn,
    last_visited_at: lastCrawl,
    document_count: documentCount,
    crawl_rules: crawlRules,
    default_crawl_rule: defaultCrawlRule,
    entry_points: entryPoints,
    deduplication_enabled: deduplicationEnabled,
    deduplication_fields: deduplicationFields,
    available_deduplication_fields: availableDeduplicationFields,
  } = payload;

  const clientPayload: CrawlerDomain = {
    id,
    url: name,
    documentCount,
    createdOn,
    crawlRules,
    sitemaps,
    entryPoints,
    deduplicationEnabled,
    deduplicationFields,
    availableDeduplicationFields,
  };

  if (lastCrawl) {
    clientPayload.lastCrawl = lastCrawl;
  }

  if (defaultCrawlRule) {
    clientPayload.defaultCrawlRule = defaultCrawlRule;
  }

  return clientPayload;
}

export function crawlRequestServerToClient(crawlRequest: CrawlRequestFromServer): CrawlRequest {
  const {
    id,
    status,
    created_at: createdAt,
    began_at: beganAt,
    completed_at: completedAt,
  } = crawlRequest;

  return {
    id,
    status,
    createdAt,
    beganAt,
    completedAt,
  };
}

export function crawlerDataServerToClient(payload: CrawlerDataFromServer): CrawlerData {
  const { domains } = payload;

  return {
    domains: domains.map((domain) => crawlerDomainServerToClient(domain)),
  };
}

export function crawlDomainValidationToResult(
  data: CrawlerDomainValidationResultFromServer
): CrawlerDomainValidationStep {
  if (!data.valid) {
    return {
      state: 'invalid',
      blockingFailure: true,
      message: data.results.find((result) => result.result === 'failure')?.comment,
    };
  }

  const warningResult = data.results.find((result) => result.result === 'warning');

  if (warningResult) {
    return {
      state: 'invalid',
      blockingFailure: !data.valid,
      message: warningResult.comment,
    };
  }

  return {
    state: 'valid',
  };
}

export const getDeleteDomainConfirmationMessage = (domainUrl: string) => {
  return i18n.translate(
    'xpack.enterpriseSearch.appSearch.crawler.action.deleteDomain.confirmationPopupMessage',
    {
      defaultMessage:
        'Are you sure you want to remove the domain "{domainUrl}" and all of its settings?',
      values: {
        domainUrl,
      },
    }
  );
};

export const getDeleteDomainSuccessMessage = (domainUrl: string) => {
  return i18n.translate(
    'xpack.enterpriseSearch.appSearch.crawler.action.deleteDomain.successMessage',
    {
      defaultMessage: "Domain '{domainUrl}' was deleted",
      values: {
        domainUrl,
      },
    }
  );
};
