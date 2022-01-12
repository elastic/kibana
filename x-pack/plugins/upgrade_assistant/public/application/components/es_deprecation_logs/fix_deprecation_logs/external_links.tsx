/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { encode } from 'rison-node';
import React, { FunctionComponent, useState, useEffect } from 'react';
import { buildPhrasesFilter, PhraseFilter } from '@kbn/es-query';

import { FormattedMessage } from '@kbn/i18n-react';
import { METRIC_TYPE } from '@kbn/analytics';
import { EuiLink, EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiPanel, EuiText } from '@elastic/eui';

import {
  APPS_WITH_DEPRECATION_LOGS,
  DEPRECATION_LOGS_ORIGIN_FIELD,
} from '../../../../../common/constants';
import { DataPublicPluginStart } from '../../../../shared_imports';
import { useAppContext } from '../../../app_context';
import {
  uiMetricService,
  UIM_OBSERVABILITY_CLICK,
  UIM_DISCOVER_CLICK,
} from '../../../lib/ui_metric';

import {
  DEPRECATION_LOGS_INDEX_PATTERN,
  DEPRECATION_LOGS_SOURCE_ID,
} from '../../../../../common/constants';

interface Props {
  checkpoint: string;
}

export const getDeprecationDataView = async (dataService: DataPublicPluginStart) => {
  const results = await dataService.dataViews.find(DEPRECATION_LOGS_INDEX_PATTERN);
  // Since the find might return also results with wildcard matchers we need to find the
  // index pattern that has an exact match with our title.
  const deprecationDataView = results.find(
    (result) => result.title === DEPRECATION_LOGS_INDEX_PATTERN
  );

  if (deprecationDataView) {
    return deprecationDataView;
  } else {
    // When creating the data view, we need to be careful when creating a data view
    // for an index that doesnt exist. Since the deprecation logs data stream is only created
    // when a deprecation log is indexed it could be possible that it might not exist at the
    // time we need to render the DiscoveryAppLink.
    // So in order to avoid those errors we need to make sure that the data view is created
    // with allowNoIndex and that we skip fetching fields to from the source index.
    const override = false;
    const skipFetchFields = true;
    // prettier-ignore
    const newDataView = await dataService.dataViews.createAndSave({
      title: DEPRECATION_LOGS_INDEX_PATTERN,
      allowNoIndex: true,
    }, override, skipFetchFields);

    return newDataView;
  }
};

const DiscoverAppLink: FunctionComponent<Props> = ({ checkpoint }) => {
  const {
    services: { data: dataService },
    plugins: { share },
  } = useAppContext();

  const [discoveryUrl, setDiscoveryUrl] = useState<string | undefined>();

  useEffect(() => {
    const getDiscoveryUrl = async () => {
      const locator = share.url.locators.get('DISCOVER_APP_LOCATOR');
      if (!locator) {
        return;
      }

      const dataView = await getDeprecationDataView(dataService);
      const field = dataView.getFieldByName(DEPRECATION_LOGS_ORIGIN_FIELD);

      let filters: PhraseFilter[] = [];

      if (field !== undefined) {
        const filter = buildPhrasesFilter(field!, [...APPS_WITH_DEPRECATION_LOGS], dataView);
        filter.meta.negate = true;
        filters = [filter];
      }

      const url = await locator?.getUrl({
        indexPatternId: dataView.id,
        query: {
          language: 'kuery',
          query: `@timestamp > "${checkpoint}"`,
        },
        filters,
      });

      setDiscoveryUrl(url);
    };

    getDiscoveryUrl();
  }, [dataService, checkpoint, share.url.locators]);

  if (discoveryUrl === undefined) {
    return null;
  }

  return (
    // eslint-disable-next-line @elastic/eui/href-or-on-click
    <EuiLink
      href={discoveryUrl}
      onClick={() => {
        uiMetricService.trackUiMetric(METRIC_TYPE.CLICK, UIM_DISCOVER_CLICK);
      }}
      data-test-subj="viewDiscoverLogs"
    >
      <FormattedMessage
        id="xpack.upgradeAssistant.overview.viewDiscoverResultsAction"
        defaultMessage="Analyze logs in Discover"
      />
    </EuiLink>
  );
};

const ObservabilityAppLink: FunctionComponent<Props> = ({ checkpoint }) => {
  const {
    services: {
      core: { http },
    },
  } = useAppContext();

  // Ideally we don't want to hardcode the path to the Log Stream app and use the UrlService.locator instead.
  // Issue opened: https://github.com/elastic/kibana/issues/104855
  const streamAppPath = '/app/logs/stream';

  const sourceId = DEPRECATION_LOGS_SOURCE_ID;
  const logPosition = `(end:now,start:${encode(checkpoint)})`;
  const logFilter = encodeURI(
    `(language:kuery,query:'not ${DEPRECATION_LOGS_ORIGIN_FIELD} : (${APPS_WITH_DEPRECATION_LOGS.join(
      ' or '
    )})')`
  );
  const queryParams = `sourceId=${sourceId}&logPosition=${logPosition}&logFilter=${logFilter}`;

  const logStreamUrl = http?.basePath?.prepend(`${streamAppPath}?${queryParams}`);

  return (
    // eslint-disable-next-line @elastic/eui/href-or-on-click
    <EuiLink
      href={logStreamUrl}
      onClick={() => {
        uiMetricService.trackUiMetric(METRIC_TYPE.CLICK, UIM_OBSERVABILITY_CLICK);
      }}
      data-test-subj="viewObserveLogs"
    >
      <FormattedMessage
        id="xpack.upgradeAssistant.overview.viewObservabilityResultsAction"
        defaultMessage="View deprecation logs in Observability"
      />
    </EuiLink>
  );
};

export const ExternalLinks: FunctionComponent<Props> = ({ checkpoint }) => {
  const { infra: hasInfraPlugin } = useAppContext().plugins;

  return (
    <EuiFlexGroup>
      {hasInfraPlugin && (
        <EuiFlexItem>
          <EuiPanel>
            <EuiText size="s">
              <p>
                <FormattedMessage
                  id="xpack.upgradeAssistant.overview.observe.observabilityDescription"
                  defaultMessage="Get insight into which deprecated APIs are being used and what applications you need to update."
                />
              </p>
            </EuiText>
            <EuiSpacer size="m" />
            <ObservabilityAppLink checkpoint={checkpoint} />
          </EuiPanel>
        </EuiFlexItem>
      )}
      <EuiFlexItem>
        <EuiPanel>
          <EuiText size="s">
            <p>
              <FormattedMessage
                id="xpack.upgradeAssistant.overview.observe.discoveryDescription"
                defaultMessage="Search and filter the deprecation logs to understand the types of changes you need to make."
              />
            </p>
          </EuiText>
          <EuiSpacer size="m" />
          <DiscoverAppLink checkpoint={checkpoint} />
        </EuiPanel>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
