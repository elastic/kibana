/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiHeaderLink } from '@elastic/eui';
import {
  DatasetQualityLocatorParams,
  DATASET_QUALITY_LOCATOR_ID,
} from '@kbn/deeplinks-observability/locators';
import { getRouterLinkProps } from '@kbn/router-utils';
import { BrowserUrlService } from '@kbn/share-plugin/public';
import React from 'react';
import { datasetQualityLinkTitle } from '../../common/translations';
import { useKibanaContextForPlugin } from '../utils/use_kibana';

export const ConnectedDatasetQualityLink = React.memo(() => {
  const {
    services: {
      share: { url },
    },
  } = useKibanaContextForPlugin();

  return <DatasetQualityLink urlService={url} />;
});

export const DatasetQualityLink = React.memo(
  ({ urlService }: { urlService: BrowserUrlService }) => {
    const locator = urlService.locators.get<DatasetQualityLocatorParams>(
      DATASET_QUALITY_LOCATOR_ID
    );

    const datasetQualityUrl = locator?.useUrl({});

    const navigateToDatasetQuality = () => {
      locator?.navigate({});
    };

    const datasetQualityLinkProps = getRouterLinkProps({
      href: datasetQualityUrl,
      onClick: navigateToDatasetQuality,
    });

    return (
      <EuiHeaderLink
        {...datasetQualityLinkProps}
        color="primary"
        data-test-subj="logsExplorerDatasetQualityLink"
      >
        {datasetQualityLinkTitle}
      </EuiHeaderLink>
    );
  }
);
