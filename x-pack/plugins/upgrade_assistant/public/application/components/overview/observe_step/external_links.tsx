/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FunctionComponent } from 'react';

import { EuiButtonEmpty, EuiIcon } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { useKibana, DataPublicPluginStart } from '../../../../shared_imports';
import {
  DEPRECATION_LOGS_INDEX_PATTERN,
  DEPRECATION_LOGS_SOURCE_ID,
} from '../../../../../common/constants';

const getDeprecationIndexPatternId = async (dataService: DataPublicPluginStart) => {
  const { indexPatterns: indexPatternService } = dataService;

  const results = await indexPatternService.find(DEPRECATION_LOGS_INDEX_PATTERN);
  // Since the find might return also results with wildcard matchers we need to find the
  // index pattern that has an exact match with our title.
  const deprecationIndexPattern = results.find(
    (result) => result.title === DEPRECATION_LOGS_INDEX_PATTERN
  );

  if (deprecationIndexPattern) {
    return deprecationIndexPattern.id;
  } else {
    const newIndexPattern = await indexPatternService.createAndSave({
      title: DEPRECATION_LOGS_INDEX_PATTERN,
    });
    return newIndexPattern.id;
  }
};

const DiscoverAppLink: FunctionComponent = () => {
  const { data: dataService, discover: discoverService } = useKibana().services;

  const onDiscoverLogsClick = async () => {
    const indexPatternId = await getDeprecationIndexPatternId(dataService);

    await discoverService?.locator?.navigate({
      indexPatternId,
      timeRange: {
        to: 'now',
        from: 'now-7d',
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
      <EuiIcon type="popout" size="s" style={{ marginLeft: 4 }} />
    </EuiButtonEmpty>
  );
};

const ObserveAppLink: FunctionComponent = () => {
  const { http } = useKibana().services;
  const logStreamUrl = http?.basePath?.prepend(
    `/app/logs/stream?sourceId=${DEPRECATION_LOGS_SOURCE_ID}`
  );

  return (
    <EuiButtonEmpty size="xs" href={logStreamUrl}>
      <FormattedMessage
        id="xpack.upgradeAssistant.overview.viewObserveResultsAction"
        defaultMessage="View deprecation logs in Observability"
      />
      <EuiIcon type="popout" size="s" style={{ marginLeft: 4 }} />
    </EuiButtonEmpty>
  );
};

export const ExternalLinks: FunctionComponent = () => {
  return (
    <div>
      <ObserveAppLink />
      <DiscoverAppLink />
    </div>
  );
};
