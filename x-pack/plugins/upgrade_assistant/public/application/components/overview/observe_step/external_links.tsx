/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiButtonEmpty } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { useKibana, DataPublicPluginStart } from '../../../../shared_imports';

// TODO: refactor into commmon folder
const INDEX_PATTERN_NAME = '.logs-deprecation.elasticsearch-default';
const DEPRECATION_SOURCE_ID = 'deprecation_logs';

const getDeprecationIndexPatternId = async (dataService: DataPublicPluginStart) => {
  const { indexPatterns: indexPatternService } = dataService;

  const results = await indexPatternService.find(INDEX_PATTERN_NAME);
  // Since the find might return also results with wildcard matchers we need to find the
  // index pattern that has an exact match with our title.
  const deprecationIndexPattern = results.find((result) => result.title === INDEX_PATTERN_NAME);

  if (deprecationIndexPattern) {
    return deprecationIndexPattern.id;
  } else {
    const newIndexPattern = await indexPatternService.createAndSave({ title: INDEX_PATTERN_NAME });
    return newIndexPattern.id;
  }
};

const DiscoverAppLink = () => {
  const { data: dataService, discover: discoverService } = useKibana().services;

  const onDiscoverLogsClick = async () => {
    const indexPatternId = await getDeprecationIndexPatternId(dataService);

    await discoverService?.locator?.navigate({
      indexPatternId,
      timeRange: {
        to: 'now',
        from: 'now-1d',
        mode: 'relative',
      },
    });
  };

  return (
    <EuiButtonEmpty size="xs" onClick={onDiscoverLogsClick}>
      <FormattedMessage
        id="xpack.upgradeAssistant.overview.viewDiscoverResultsAction"
        defaultMessage="Analyse logs in Discover "
      />
    </EuiButtonEmpty>
  );
};

const ObserveAppLink = () => {
  const { http } = useKibana().services;
  const logStreamUrl = http?.basePath?.prepend(
    `/app/logs/stream?sourceId=${DEPRECATION_SOURCE_ID}`
  );

  return (
    <EuiButtonEmpty size="xs" href={logStreamUrl}>
      <FormattedMessage
        id="xpack.upgradeAssistant.overview.viewObserveResultsAction"
        defaultMessage="View deprecation logs in Observability"
      />
    </EuiButtonEmpty>
  );
};

export const ExternalLinks = () => {
  return (
    <div>
      <ObserveAppLink />
      <DiscoverAppLink />
    </div>
  );
};
