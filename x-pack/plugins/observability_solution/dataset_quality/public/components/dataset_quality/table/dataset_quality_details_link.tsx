/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiHeaderLink } from '@elastic/eui';
import {
  DATA_QUALITY_DETAILS_LOCATOR_ID,
  DataQualityDetailsLocatorParams,
} from '@kbn/deeplinks-observability';
import { getRouterLinkProps } from '@kbn/router-utils';
import { BrowserUrlService } from '@kbn/share-plugin/public';
import React from 'react';
import { TimeRangeConfig } from '../../../../common/types';

export const DatasetQualityDetailsLink = React.memo(
  ({
    urlService,
    dataStream,
    timeRange,
    children,
  }: {
    urlService: BrowserUrlService;
    dataStream: string;
    timeRange: TimeRangeConfig;
    children: React.ReactNode;
  }) => {
    const locator = urlService.locators.get<DataQualityDetailsLocatorParams>(
      DATA_QUALITY_DETAILS_LOCATOR_ID
    );
    const datasetQualityUrl = locator?.getRedirectUrl({ dataStream, timeRange });
    const navigateToDatasetQuality = () => {
      locator?.navigate({ dataStream, timeRange });
    };

    const datasetQualityLinkDetailsProps = getRouterLinkProps({
      href: datasetQualityUrl,
      onClick: navigateToDatasetQuality,
    });

    return (
      <EuiHeaderLink
        {...datasetQualityLinkDetailsProps}
        color="primary"
        data-test-subj={`datasetQualityTableDetailsLink-${dataStream}`}
        target="_blank"
        size="xs"
      >
        {children}
      </EuiHeaderLink>
    );
  }
);
