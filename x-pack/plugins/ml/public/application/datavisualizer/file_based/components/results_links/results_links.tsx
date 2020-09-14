/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, useState, useEffect, useCallback } from 'react';
import moment from 'moment';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiFlexGroup, EuiFlexItem, EuiCard, EuiIcon } from '@elastic/eui';
import { ml } from '../../../../services/ml_api_service';
import { isFullLicense } from '../../../../license';
import { checkPermission } from '../../../../capabilities/check_capabilities';
import { mlNodesAvailable } from '../../../../ml_nodes_check/check_ml_nodes';
import { useMlKibana, useMlUrlGenerator, useNavigateToPath } from '../../../../contexts/kibana';
import { ML_PAGES } from '../../../../../../common/constants/ml_url_generator';
import { MlCommonGlobalState } from '../../../../../../common/types/ml_url_generator';
import {
  DISCOVER_APP_URL_GENERATOR,
  DiscoverUrlGeneratorState,
} from '../../../../../../../../../src/plugins/discover/public';

const RECHECK_DELAY_MS = 3000;

interface Props {
  index: string;
  indexPatternId: string;
  timeFieldName?: string;
  createIndexPattern: boolean;
  showFilebeatFlyout(): void;
}

export const ResultsLinks: FC<Props> = ({
  index,
  indexPatternId,
  timeFieldName,
  createIndexPattern,
  showFilebeatFlyout,
}) => {
  const [duration, setDuration] = useState({
    from: 'now-30m',
    to: 'now',
  });
  const [showCreateJobLink, setShowCreateJobLink] = useState(false);
  const [globalState, setGlobalState] = useState<MlCommonGlobalState | undefined>();

  const [discoverLink, setDiscoverLink] = useState('');
  const {
    services: {
      http: { basePath },
    },
  } = useMlKibana();
  const mlUrlGenerator = useMlUrlGenerator();
  const navigateToPath = useNavigateToPath();

  const {
    services: {
      share: {
        urlGenerators: { getUrlGenerator },
      },
    },
  } = useMlKibana();

  useEffect(() => {
    let unamounted = false;

    const getDiscoverUrl = async (): Promise<void> => {
      const state: DiscoverUrlGeneratorState = {
        indexPatternId,
      };

      if (globalState?.time) {
        state.timeRange = globalState.time;
      }
      if (!unamounted) {
        const discoverUrlGenerator = getUrlGenerator(DISCOVER_APP_URL_GENERATOR);
        const discoverUrl = await discoverUrlGenerator.createUrl(state);
        setDiscoverLink(discoverUrl);
      }
    };
    getDiscoverUrl();

    return () => {
      unamounted = true;
    };
  }, [indexPatternId, getUrlGenerator]);

  const openInDataVisualizer = useCallback(async () => {
    const path = await mlUrlGenerator.createUrl({
      page: ML_PAGES.DATA_VISUALIZER_INDEX_VIEWER,
      pageState: {
        index: indexPatternId,
        globalState,
      },
    });
    await navigateToPath(path);
  }, [indexPatternId, globalState]);

  const redirectToADCreateJobsSelectTypePage = useCallback(async () => {
    const path = await mlUrlGenerator.createUrl({
      page: ML_PAGES.ANOMALY_DETECTION_CREATE_JOB_SELECT_TYPE,
      pageState: {
        index: indexPatternId,
        globalState,
      },
    });
    await navigateToPath(path);
  }, [indexPatternId, globalState]);

  useEffect(() => {
    setShowCreateJobLink(checkPermission('canCreateJob') && mlNodesAvailable());
    updateTimeValues();
  }, []);

  useEffect(() => {
    const _globalState: MlCommonGlobalState = {
      time: {
        from: duration.from,
        to: duration.to,
      },
    };
    setGlobalState(_globalState);
  }, [duration]);

  async function updateTimeValues(recheck = true) {
    if (timeFieldName !== undefined) {
      const { from, to } = await getFullTimeRange(index, timeFieldName);
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
      {createIndexPattern && (
        <EuiFlexItem>
          <EuiCard
            icon={<EuiIcon size="xxl" type={`discoverApp`} />}
            title={
              <FormattedMessage
                id="xpack.ml.fileDatavisualizer.resultsLinks.viewIndexInDiscoverTitle"
                defaultMessage="View index in Discover"
              />
            }
            description=""
            href={discoverLink}
          />
        </EuiFlexItem>
      )}

      {isFullLicense() === true &&
        timeFieldName !== undefined &&
        showCreateJobLink &&
        createIndexPattern && (
          <EuiFlexItem>
            <EuiCard
              icon={<EuiIcon size="xxl" type={`machineLearningApp`} />}
              title={
                <FormattedMessage
                  id="xpack.ml.fileDatavisualizer.resultsLinks.createNewMLJobTitle"
                  defaultMessage="Create new ML job"
                />
              }
              description=""
              onClick={redirectToADCreateJobsSelectTypePage}
            />
          </EuiFlexItem>
        )}

      {createIndexPattern && (
        <EuiFlexItem>
          <EuiCard
            icon={<EuiIcon size="xxl" type={`dataVisualizer`} />}
            title={
              <FormattedMessage
                id="xpack.ml.fileDatavisualizer.resultsLinks.openInDataVisualizerTitle"
                defaultMessage="Open in Data Visualizer"
              />
            }
            description=""
            onClick={openInDataVisualizer}
          />
        </EuiFlexItem>
      )}

      <EuiFlexItem>
        <EuiCard
          icon={<EuiIcon size="xxl" type={`managementApp`} />}
          title={
            <FormattedMessage
              id="xpack.ml.fileDatavisualizer.resultsLinks.indexManagementTitle"
              defaultMessage="Index Management"
            />
          }
          description=""
          href={`${basePath.get()}/app/management/data/index_management/indices`}
        />
      </EuiFlexItem>

      <EuiFlexItem>
        <EuiCard
          icon={<EuiIcon size="xxl" type={`managementApp`} />}
          title={
            <FormattedMessage
              id="xpack.ml.fileDatavisualizer.resultsLinks.indexPatternManagementTitle"
              defaultMessage="Index Pattern Management"
            />
          }
          description=""
          href={`${basePath.get()}/app/management/kibana/indexPatterns${
            createIndexPattern ? `/patterns/${indexPatternId}` : ''
          }`}
        />
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiCard
          icon={<EuiIcon size="xxl" type={`filebeatApp`} />}
          title={
            <FormattedMessage
              id="xpack.ml.fileDatavisualizer.resultsLinks.fileBeatConfig"
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

async function getFullTimeRange(index: string, timeFieldName: string) {
  const query = { bool: { must: [{ query_string: { analyze_wildcard: true, query: '*' } }] } };
  const resp = await ml.getTimeFieldRange({
    index,
    timeFieldName,
    query,
  });

  return {
    from: moment(resp.start.epoch).toISOString(),
    to: moment(resp.end.epoch).toISOString(),
  };
}
