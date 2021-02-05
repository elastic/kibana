/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useState, useEffect } from 'react';

import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';
import {
  EuiSpacer,
  EuiText,
  EuiTitle,
  EuiFlexGroup,
  EuiFlexItem,
  EuiCard,
  EuiIcon,
} from '@elastic/eui';
import { Link } from 'react-router-dom';
import { CreateJobLinkCard } from '../../../../components/create_job_link_card';
import { DataRecognizer } from '../../../../components/data_recognizer';
import { ML_PAGES } from '../../../../../../common/constants/ml_url_generator';
import {
  DISCOVER_APP_URL_GENERATOR,
  DiscoverUrlGeneratorState,
} from '../../../../../../../../../src/plugins/discover/public';
import { useMlKibana } from '../../../../contexts/kibana';
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
  const showCreateJob =
    isFullLicense() &&
    checkPermission('canCreateJob') &&
    mlNodesAvailable() &&
    indexPattern.timeFieldName !== undefined;
  const createJobLink = `/${ML_PAGES.ANOMALY_DETECTION_CREATE_JOB}/advanced?index=${indexPattern.id}`;

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
      {showCreateJob && (
        <>
          <EuiTitle size="s">
            <h2>
              <FormattedMessage
                id="xpack.ml.datavisualizer.actionsPanel.createJobTitle"
                defaultMessage="Create Job"
              />
            </h2>
          </EuiTitle>
          <EuiSpacer size="s" />
          <div hidden={recognizerResultsCount === 0}>
            <EuiText size="s" color="subdued">
              <p>
                <FormattedMessage
                  id="xpack.ml.datavisualizer.actionsPanel.selectKnownConfigurationDescription"
                  defaultMessage="Select known configurations for recognized data:"
                />
              </p>
            </EuiText>
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
          <EuiText size="s" color="subdued">
            <p>
              <FormattedMessage
                id="xpack.ml.datavisualizer.actionsPanel.createJobDescription"
                defaultMessage="Use the Advanced job wizard to create a job to find anomalies in this data:"
              />
            </p>
          </EuiText>
          <EuiSpacer size="m" />
          <Link to={createJobLink}>
            <CreateJobLinkCard
              icon="createAdvancedJob"
              title={i18n.translate('xpack.ml.datavisualizer.actionsPanel.advancedTitle', {
                defaultMessage: 'Advanced',
              })}
              description={i18n.translate(
                'xpack.ml.datavisualizer.actionsPanel.advancedDescription',
                {
                  defaultMessage:
                    'Use the full range of options to create a job for more advanced use cases',
                }
              )}
              data-test-subj="mlDataVisualizerCreateAdvancedJobCard"
            />
          </Link>
          <EuiSpacer size="m" />
        </>
      )}

      {discoverLink && (
        <>
          <EuiTitle size="s">
            <h2>
              <FormattedMessage
                id="xpack.ml.datavisualizer.actionsPanel.exploreTitle"
                defaultMessage="Explore"
              />
            </h2>
          </EuiTitle>
          <EuiSpacer size="m" />
          <EuiFlexItem>
            <EuiCard
              data-test-subj="mlDataVisualizerViewInDiscoverCard"
              icon={<EuiIcon size="xxl" type={`discoverApp`} />}
              description={i18n.translate(
                'xpack.ml.datavisualizer.actionsPanel.viewIndexInDiscoverDescription',
                {
                  defaultMessage: 'Explore index in Discover',
                }
              )}
              title={
                <FormattedMessage
                  id="xpack.ml.datavisualizer.actionsPanel.discoverAppTitle"
                  defaultMessage="Discover"
                />
              }
              href={discoverLink}
            />
          </EuiFlexItem>
        </>
      )}
    </div>
  );
};
