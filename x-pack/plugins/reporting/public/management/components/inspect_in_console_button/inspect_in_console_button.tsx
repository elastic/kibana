/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { compressToEncodedURIComponent } from 'lz-string';
import React, { useCallback } from 'react';

import { EuiContextMenuItem } from '@elastic/eui';
import type { ISearchStartSearchSource } from '@kbn/data-plugin/common';
import { i18n } from '@kbn/i18n';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { type TaskPayloadCSV } from '@kbn/reporting-export-types-csv-common';
import type { ClientConfigType, Job, KibanaContext } from '@kbn/reporting-public';
import type { LocatorClient } from '@kbn/share-plugin/common/url_service';

import { getPitApiTextForConsole } from './get_console_text_pit';
import { getScrollApiTextForConsole } from './get_console_text_scroll';

interface PropsUI {
  job: Job;
  csvConfig: ClientConfigType['csv'];
  searchSourceStart: ISearchStartSearchSource;
  locators: LocatorClient;
}

const InspectInConsoleButtonUi: React.FC<PropsUI> = (props) => {
  const { csvConfig, job, searchSourceStart, locators } = props;

  const { title: jobTitle, pagingStrategy } = job;
  const serializedSearchSource = (job.payload as TaskPayloadCSV).searchSource;

  const handleDevToolsLinkClick = useCallback(async () => {
    const searchSource = await searchSourceStart.create(serializedSearchSource);
    const index = searchSource.getDataViewLazy();
    if (!index) {
      throw new Error(`The search must have a reference to an index pattern!`);
    }
    const indexPatternTitle = index.getIndexPattern();
    const queryUri = compressToEncodedURIComponent(
      pagingStrategy === 'scroll'
        ? getScrollApiTextForConsole(jobTitle, indexPatternTitle, searchSource, csvConfig)
        : getPitApiTextForConsole(jobTitle, indexPatternTitle, searchSource, csvConfig)
    );
    const consoleLocator = locators.get('CONSOLE_APP_LOCATOR');
    consoleLocator?.navigate({
      loadFrom: `data:text/plain,${queryUri}`,
    });
  }, [searchSourceStart, serializedSearchSource, jobTitle, pagingStrategy, csvConfig, locators]);

  return (
    <EuiContextMenuItem
      data-test-subj="reportInfoFlyoutOpenInConsoleButton"
      key="download"
      icon="wrench"
      onClick={handleDevToolsLinkClick}
    >
      {i18n.translate('xpack.reporting.reportInfoFlyout.openInConsole', {
        defaultMessage: 'Inspect query in Console',
        description: 'An option in a menu of actions.',
      })}
    </EuiContextMenuItem>
  );
};

interface Props {
  job: Job;
  config: ClientConfigType;
}

export const InspectInConsoleButton: React.FC<Props> = (props) => {
  const { config, job } = props;
  const { services } = useKibana<KibanaContext>();
  const { application, data, share } = services;
  const { capabilities } = application;
  const { locators } = share.url;

  // To show the Console button,
  // check if job object type is search,
  // and if both the Dev Tools UI and the Console UI are enabled.
  const canShowDevTools = job.objectType === 'search' && capabilities.dev_tools.show;
  if (!canShowDevTools) {
    return null;
  }

  return (
    <InspectInConsoleButtonUi
      searchSourceStart={data.search.searchSource}
      locators={locators}
      job={job}
      csvConfig={config.csv}
    />
  );
};
