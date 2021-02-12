/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useState, useEffect } from 'react';

import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';
import { EuiSpacer, EuiText, EuiTitle, EuiFlexGroup } from '@elastic/eui';
import { LinkCard } from '../../../../components/link_card';
import { DataRecognizer } from '../../../../components/data_recognizer';
import { ML_PAGES } from '../../../../../../common/constants/ml_url_generator';
import {
  DISCOVER_APP_URL_GENERATOR,
  DiscoverUrlGeneratorState,
} from '../../../../../../../../../src/plugins/discover/public';
import { useMlKibana, useMlLink } from '../../../../contexts/kibana';
import { isFullLicense } from '../../../../license';
import { checkPermission } from '../../../../capabilities/check_capabilities';
import { mlNodesAvailable } from '../../../../ml_nodes_check';
import { useUrlState } from '../../../../util/url_state';
import type { IIndexPattern } from '../../../../../../../../../src/plugins/data/common';

interface Props {
  indexPattern: IIndexPattern;
  searchString?: string | { [key: string]: any };
  searchQueryLanguage?: string;
}

export const ActionsPanel: FC<Props> = ({ indexPattern, searchString, searchQueryLanguage }) => {
  const [recognizerResultsCount, setRecognizerResultsCount] = useState(0);
  const [discoverLink, setDiscoverLink] = useState('');
  const {
    services: {
      share: {
        urlGenerators: { getUrlGenerator },
      },
    },
  } = useMlKibana();
  const [globalState] = useUrlState('_g');

  const recognizerResults = {
    count: 0,
    onChange() {
      setRecognizerResultsCount(recognizerResults.count);
    },
  };
  const mlAvailable = isFullLicense() && checkPermission('canCreateJob') && mlNodesAvailable();
  const showCreateAnomalyDetectionJob = mlAvailable && indexPattern.timeFieldName !== undefined;

  const createJobLink = useMlLink({
    page: ML_PAGES.ANOMALY_DETECTION_CREATE_JOB_ADVANCED,
    pageState: { index: indexPattern.id },
  });

  const createDataFrameAnalyticsLink = useMlLink({
    page: ML_PAGES.DATA_FRAME_ANALYTICS_CREATE_JOB,
    pageState: { index: indexPattern.id },
  });

  useEffect(() => {
    let unmounted = false;

    const indexPatternId = indexPattern.id;
    const getDiscoverUrl = async (): Promise<void> => {
      const state: DiscoverUrlGeneratorState = {
        indexPatternId,
      };
      if (searchString && searchQueryLanguage !== undefined) {
        state.query = { query: searchString, language: searchQueryLanguage };
      }
      if (globalState?.time) {
        state.timeRange = globalState.time;
      }
      if (globalState?.refreshInterval) {
        state.refreshInterval = globalState.refreshInterval;
      }

      let discoverUrlGenerator;
      try {
        discoverUrlGenerator = getUrlGenerator(DISCOVER_APP_URL_GENERATOR);
      } catch (error) {
        // ignore error thrown when url generator is not available
        return;
      }

      const discoverUrl = await discoverUrlGenerator.createUrl(state);
      if (!unmounted) {
        setDiscoverLink(discoverUrl);
      }
    };

    getDiscoverUrl();
    return () => {
      unmounted = true;
    };
  }, [indexPattern, searchString, searchQueryLanguage, globalState]);

  // Note we use display:none for the DataRecognizer section as it needs to be
  // passed the recognizerResults object, and then run the recognizer check which
  // controls whether the recognizer section is ultimately displayed.
  return (
    <div data-test-subj="mlDataVisualizerActionsPanel">
      {mlAvailable && (
        <>
          <EuiTitle size="s">
            <h2>
              <FormattedMessage
                id="xpack.ml.datavisualizer.actionsPanel.createJobTitle"
                defaultMessage="Create job"
              />
            </h2>
          </EuiTitle>
          <EuiSpacer size="s" />
          {showCreateAnomalyDetectionJob && (
            <>
              <div hidden={recognizerResultsCount === 0}>
                <EuiSpacer size="m" />
                <EuiFlexGroup gutterSize="l" responsive={true} wrap={true}>
                  <DataRecognizer
                    indexPattern={indexPattern}
                    savedSearch={null}
                    results={recognizerResults}
                  />
                </EuiFlexGroup>
                <EuiSpacer size="l" />
              </div>
              <EuiSpacer size="m" />
              <LinkCard
                href={createJobLink}
                icon="createAdvancedJob"
                title={i18n.translate('xpack.ml.datavisualizer.actionsPanel.advancedTitle', {
                  defaultMessage: 'Advanced anomaly detection',
                })}
                description={i18n.translate(
                  'xpack.ml.datavisualizer.actionsPanel.advancedDescription',
                  {
                    defaultMessage:
                      'Create a job with the full range of options for more advanced use cases.',
                  }
                )}
                data-test-subj="mlDataVisualizerCreateAdvancedJobCard"
              />
              <EuiSpacer size="m" />
            </>
          )}
        </>
      )}
      {mlAvailable && indexPattern.id !== undefined && createDataFrameAnalyticsLink && (
        <>
          <EuiSpacer size="m" />
          <LinkCard
            href={createDataFrameAnalyticsLink}
            icon="classificationJob"
            description={i18n.translate(
              'xpack.ml.datavisualizer.actionsPanel.dataframeTypesDescription',
              {
                defaultMessage:
                  'Create outlier detection, regression, or classification analytics.',
              }
            )}
            title={
              <FormattedMessage
                id="xpack.ml.datavisualizer.actionsPanel.dataframeAnalyticsTitle"
                defaultMessage="Data frame analytics"
              />
            }
            data-test-subj="mlDataVisualizerCreateDataFrameAnalyticsCard"
          />
          <EuiSpacer size="m" />
        </>
      )}

      {discoverLink && (
        <>
          <EuiTitle size="s">
            <h2>
              <FormattedMessage
                id="xpack.ml.datavisualizer.actionsPanel.exploreTitle"
                defaultMessage="Explore your data"
              />
            </h2>
          </EuiTitle>
          <EuiSpacer size="m" />
          <LinkCard
            href={discoverLink}
            icon="discoverApp"
            description={i18n.translate(
              'xpack.ml.datavisualizer.actionsPanel.viewIndexInDiscoverDescription',
              {
                defaultMessage: 'Explore the documents in your index.',
              }
            )}
            title={
              <FormattedMessage
                id="xpack.ml.datavisualizer.actionsPanel.discoverAppTitle"
                defaultMessage="Discover"
              />
            }
            data-test-subj="mlDataVisualizerViewInDiscoverCard"
          />
        </>
      )}
    </div>
  );
};
