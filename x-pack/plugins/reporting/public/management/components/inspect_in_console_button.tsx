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
import {
  getQueryFromCsvJob,
  QueryInspection,
  TaskPayloadCSV,
} from '@kbn/reporting-export-types-csv-common';
import type { ClientConfigType } from '@kbn/reporting-public';
import type { LocatorClient } from '@kbn/share-plugin/common/url_service';

import type { Job } from '../../lib/job';
import type { KibanaContext } from '../../types';

interface PropsUI {
  job: Job;
  csvConfig: ClientConfigType['csv'];
  searchSourceStart: ISearchStartSearchSource;
  locators: LocatorClient;
}

const InspectInConsoleButtonUi: React.FC<PropsUI> = (props) => {
  const { csvConfig, job, searchSourceStart, locators } = props;

  const { title: jobTitle } = job;
  const serializedSearchSource = (job.payload as TaskPayloadCSV).searchSource;

  const handleDevToolsLinkClick = useCallback(async () => {
    const searchSource = await searchSourceStart.create(serializedSearchSource);
    const index = searchSource.getField('index');
    if (!index) {
      throw new Error(`The search must have a reference to an index pattern!`);
    }
    const indexPatternTitle = index.getIndexPattern();
    const examplePitId = i18n.translate(
      'xpack.reporting.reportInfoFlyout.devToolsContent.examplePitId',
      {
        defaultMessage: `[ID returned from first request]`,
        description: `This gets used in place of an ID string that is sent in a request body.`,
      }
    );
    const queryInfo = getQueryFromCsvJob(searchSource, csvConfig, examplePitId);
    const queryUri = compressToEncodedURIComponent(
      getTextForConsole(jobTitle, indexPatternTitle, queryInfo, csvConfig)
    );
    const consoleLocator = locators.get('CONSOLE_APP_LOCATOR');
    consoleLocator?.navigate({
      loadFrom: `data:text/plain,${queryUri}`,
    });
  }, [searchSourceStart, serializedSearchSource, jobTitle, csvConfig, locators]);

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

const getTextForConsole = (
  jobTitle: string,
  indexPattern: string,
  queryInfo: QueryInspection,
  csvConfig: ClientConfigType['csv']
) => {
  const { requestBody } = queryInfo;
  const queryAsString = JSON.stringify(requestBody, null, '  ');

  const pitRequest =
    `POST /${indexPattern}/_pit?keep_alive=${csvConfig.scroll.duration}` +
    `&ignore_unavailable=true`;
  const queryRequest = `POST /_search`;
  const closePitRequest = `DELETE /_pit\n${JSON.stringify({
    id: `[ID returned from latest request]`,
  })}`;

  const introText = i18n.translate(
    // intro to the content
    'xpack.reporting.reportInfoFlyout.devToolsContent.introText',
    {
      description: `Script used in the Console app`,
      defaultMessage: `
# Report title: {jobTitle}
# These are the queries used when exporting data for
# the CSV report.
#
# For reference about the Elasticsearch Point-In-Time
# API, see
# https://www.elastic.co/guide/en/elasticsearch/reference/current/point-in-time-api.html

# The first query opens a Point-In-Time (PIT) context
# and receive back the ID reference. The "keep_alive"
# value is taken from the
# "xpack.reporting.csv.scroll.duration" setting.
#
# The response will include an "id" value, which is
# needed for the second query.
{pitRequest}`,
      values: {
        jobTitle,
        pitRequest,
      },
    }
  );

  const queryText = i18n.translate(
    // query with the request path and body
    'xpack.reporting.reportInfoFlyout.devToolsContent.queryText',
    {
      description: `Script used in the Console app`,
      defaultMessage: `
# The second query executes a search using the PIT ID.
# The "keep_alive" and "size" values come from the
# "xpack.reporting.csv.scroll.duration" and
# "xpack.reporting.csv.scroll.size" settings in
# kibana.yml.
#
# The reponse will include new a PIT ID, which might
# not be the same as the ID returned from the first
# query.
{queryRequest}
{queryAsString}`,
      values: { queryRequest, queryAsString },
    }
  );

  const pagingText = i18n.translate(
    // info about querying further pages, and link to documentation
    'xpack.reporting.reportInfoFlyout.devToolsContent.pagingText',
    {
      description: `Script used in the Console app`,
      defaultMessage: `# The first request retrieves the first page of search
# results. If you want to retrieve more hits, use PIT
# with search_after. Always use the PIT ID from the
# latest search response. See
# https://www.elastic.co/guide/en/elasticsearch/reference/current/paginate-search-results.html`,
    }
  );

  const closingText = i18n.translate(
    // reminder to close the point-in-time context
    'xpack.reporting.reportInfoFlyout.devToolsContent.closingText',
    {
      description: `Script used in the Console app`,
      defaultMessage: `
# Finally, release the resources held in Elasticsearch
# memory by clearing the PIT.
{closePitRequest}
  `,
      values: { closePitRequest },
    }
  );

  return (introText + queryText + pagingText + closingText).trim();
};
