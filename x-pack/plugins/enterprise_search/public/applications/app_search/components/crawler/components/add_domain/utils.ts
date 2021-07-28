/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HttpLogic } from '../../../../../shared/http';

import { CrawlerDomainValidationResultFromServer } from '../../types';

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
      const route = '/api/app_search/crawler/validate_url';
      const checks = ['tcp', 'url_request'];

      const httpsCheckData: CrawlerDomainValidationResultFromServer = await http.post(route, {
        body: JSON.stringify({ url: `https://${domain}`, checks }),
      });
      if (httpsCheckData.valid) {
        return `https://${domain}`;
      }

      const httpCheckData: CrawlerDomainValidationResultFromServer = await http.post(route, {
        body: JSON.stringify({ url: `http://${domain}`, checks }),
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
