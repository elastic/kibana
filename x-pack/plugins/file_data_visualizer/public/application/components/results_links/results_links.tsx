/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useState, useEffect } from 'react';
import moment from 'moment';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiFlexGroup, EuiFlexItem, EuiCard, EuiIcon } from '@elastic/eui';
import {
  DISCOVER_APP_URL_GENERATOR,
  DiscoverUrlGeneratorState,
} from '../../../../../../../src/plugins/discover/public';
import { TimeRange, RefreshInterval } from '../../../../../../../src/plugins/data/public';
import { FindFileStructureResponse } from '../../../../../file_upload/common';
import type { FileUploadPluginStart } from '../../../../../file_upload/public';
import { useFileDataVisualizerKibana } from '../../kibana_context';

interface Props {
  fieldStats: FindFileStructureResponse['field_stats'];
  index: string;
  indexPatternId: string;
  timeFieldName?: string;
  createIndexPattern: boolean;
  showFilebeatFlyout(): void;
}

interface GlobalState {
  time?: TimeRange;
  refreshInterval?: RefreshInterval;
}

const RECHECK_DELAY_MS = 3000;

export const ResultsLinks: FC<Props> = ({
  fieldStats,
  index,
  indexPatternId,
  timeFieldName,
  createIndexPattern,
  showFilebeatFlyout,
}) => {
  const {
    services: { fileUpload },
  } = useFileDataVisualizerKibana();

  const [duration, setDuration] = useState({
    from: 'now-30m',
    to: 'now',
  });
  const [globalState, setGlobalState] = useState<GlobalState | undefined>();

  const [discoverLink, setDiscoverLink] = useState('');
  const [indexManagementLink, setIndexManagementLink] = useState('');
  const [indexPatternManagementLink, setIndexPatternManagementLink] = useState('');

  const {
    services: {
      application: { getUrlForApp, capabilities },
      share: {
        urlGenerators: { getUrlGenerator },
      },
    },
  } = useFileDataVisualizerKibana();

  useEffect(() => {
    let unmounted = false;

    const getDiscoverUrl = async (): Promise<void> => {
      const isDiscoverAvailable = capabilities.discover?.show ?? false;
      if (!isDiscoverAvailable) {
        return;
      }

      const state: DiscoverUrlGeneratorState = {
        indexPatternId,
      };

      if (globalState?.time) {
        state.timeRange = globalState.time;
      }

      let discoverUrlGenerator;
      try {
        discoverUrlGenerator = getUrlGenerator(DISCOVER_APP_URL_GENERATOR);
      } catch (error) {
        // ignore error thrown when url generator is not available
      }

      if (!discoverUrlGenerator) {
        return;
      }
      const discoverUrl = await discoverUrlGenerator.createUrl(state);
      if (!unmounted) {
        setDiscoverLink(discoverUrl);
      }
    };

    getDiscoverUrl();

    if (!unmounted) {
      setIndexManagementLink(
        getUrlForApp('management', { path: '/data/index_management/indices' })
      );
      setIndexPatternManagementLink(
        getUrlForApp('management', {
          path: `/kibana/indexPatterns${createIndexPattern ? `/patterns/${indexPatternId}` : ''}`,
        })
      );
    }

    return () => {
      unmounted = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [indexPatternId, getUrlGenerator, JSON.stringify(globalState)]);

  useEffect(() => {
    updateTimeValues();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const _globalState: GlobalState = {
      time: {
        from: duration.from,
        to: duration.to,
      },
    };
    setGlobalState(_globalState);
  }, [duration]);

  useEffect(() => {
    // Update the global time range from known timeFieldName if stats is available
    if (
      fieldStats &&
      typeof fieldStats === 'object' &&
      timeFieldName !== undefined &&
      fieldStats.hasOwnProperty(timeFieldName) &&
      fieldStats[timeFieldName].earliest !== undefined &&
      fieldStats[timeFieldName].latest !== undefined
    ) {
      setGlobalState({
        time: { from: fieldStats[timeFieldName].earliest!, to: fieldStats[timeFieldName].latest! },
      });
    }
  }, [timeFieldName, fieldStats]);

  async function updateTimeValues(recheck = true) {
    if (timeFieldName !== undefined) {
      const { from, to } = await getFullTimeRange(index, timeFieldName, fileUpload);
      setDuration({
        from: from === null ? duration.from : from,
        to: to === null ? duration.to : to,
      });

      // these links may have been drawn too quickly for the index to be ready
      // to give us the correct start and end times.
      // especially if the data was small.
      // so if the start and end were null, try again in 3s
      if (recheck && (from === null || to === null)) {
        setTimeout(() => {
          updateTimeValues(false);
        }, RECHECK_DELAY_MS);
      }
    }
  }

  return (
    <EuiFlexGroup gutterSize="l">
      {createIndexPattern && discoverLink && (
        <EuiFlexItem>
          <EuiCard
            icon={<EuiIcon size="xxl" type={`discoverApp`} />}
            title={
              <FormattedMessage
                id="xpack.fileDataVisualizer.resultsLinks.viewIndexInDiscoverTitle"
                defaultMessage="View index in Discover"
              />
            }
            description=""
            href={discoverLink}
          />
        </EuiFlexItem>
      )}

      {indexManagementLink && (
        <EuiFlexItem>
          <EuiCard
            icon={<EuiIcon size="xxl" type={`managementApp`} />}
            title={
              <FormattedMessage
                id="xpack.fileDataVisualizer.resultsLinks.indexManagementTitle"
                defaultMessage="Index Management"
              />
            }
            description=""
            href={indexManagementLink}
          />
        </EuiFlexItem>
      )}

      {indexPatternManagementLink && (
        <EuiFlexItem>
          <EuiCard
            icon={<EuiIcon size="xxl" type={`managementApp`} />}
            title={
              <FormattedMessage
                id="xpack.fileDataVisualizer.resultsLinks.indexPatternManagementTitle"
                defaultMessage="Index Pattern Management"
              />
            }
            description=""
            href={indexPatternManagementLink}
          />
        </EuiFlexItem>
      )}
      <EuiFlexItem>
        <EuiCard
          icon={<EuiIcon size="xxl" type={`filebeatApp`} />}
          data-test-subj="fileDataVisFilebeatConfigLink"
          title={
            <FormattedMessage
              id="xpack.fileDataVisualizer.resultsLinks.fileBeatConfig"
              defaultMessage="Create Filebeat configuration"
            />
          }
          description=""
          onClick={showFilebeatFlyout}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

async function getFullTimeRange(
  index: string,
  timeFieldName: string,
  { getTimeFieldRange }: FileUploadPluginStart
) {
  const query = { bool: { must: [{ query_string: { analyze_wildcard: true, query: '*' } }] } };
  const resp = await getTimeFieldRange(index, query, timeFieldName);

  return {
    from: moment(resp.start.epoch).toISOString(),
    to: moment(resp.end.epoch).toISOString(),
  };
}
