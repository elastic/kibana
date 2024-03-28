/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { INGESTION_METHOD_IDS } from '../../../../../common/constants';

import apiLogo from '../../../../assets/images/api_image.png';
import connectorLogo from '../../../../assets/images/search_connector.svg';
import crawlerLogo from '../../../../assets/images/search_crawler.svg';
import { ConnectorIcon } from '../../../shared/icons/connector';
import { CrawlerIcon } from '../../../shared/icons/crawler';

import { UNIVERSAL_LANGUAGE_VALUE } from './constants';
import { LanguageForOptimization } from './types';

// Enterprise Search expects the Universal language option to be represented by null
// but we can't use null as the value for an EuiSelectOption
export const getLanguageForOptimization = (language: string): LanguageForOptimization =>
  language === UNIVERSAL_LANGUAGE_VALUE ? null : language;

export function getIngestionMethodIconType(type: string): string {
  switch (type) {
    case INGESTION_METHOD_IDS.CRAWLER:
      return crawlerLogo;
    case INGESTION_METHOD_IDS.CONNECTOR:
      return connectorLogo;
    default:
      return apiLogo;
  }
}

export function getIngestionMethodButtonIcon(type: string): React.FC | string {
  switch (type) {
    case INGESTION_METHOD_IDS.CRAWLER:
      return CrawlerIcon;
    case INGESTION_METHOD_IDS.CONNECTOR:
      return ConnectorIcon;
    default:
      return 'console';
  }
}
