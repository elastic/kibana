/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, useState } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiPage,
  EuiPageBody,
  EuiTitle,
  EuiSpacer,
  EuiCallOut,
  EuiText,
  EuiFlexGrid,
  EuiFlexItem,
  EuiLink,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { useNavigateToPath } from '../../../../contexts/kibana';

import { useMlContext } from '../../../../contexts/ml';
import { isSavedSearchSavedObject } from '../../../../../../common/types/kibana';
import { DataRecognizer } from '../../../../components/data_recognizer';
import { addItemToRecentlyAccessed } from '../../../../util/recently_accessed';
import { timeBasedIndexCheck } from '../../../../util/index_utils';
import { CreateJobLinkCard } from '../../../../components/create_job_link_card';
import { CategorizationIcon } from './categorization_job_icon';
import { ML_PAGES } from '../../../../../../common/constants/ml_url_generator';
import { useCreateAndNavigateToMlLink } from '../../../../contexts/kibana/use_create_url';

export const Page: FC = () => {
  const mlContext = useMlContext();
  const navigateToPath = useNavigateToPath();
  const onSelectDifferentIndex = useCreateAndNavigateToMlLink(
    ML_PAGES.ANOMALY_DETECTION_CREATE_JOB_SELECT_INDEX
  );

  const [recognizerResultsCount, setRecognizerResultsCount] = useState(0);

  const { currentSavedSearch, currentIndexPattern } = mlContext;

  const isTimeBasedIndex = timeBasedIndexCheck(currentIndexPattern);
  const indexWarningTitle =
    !isTimeBasedIndex && isSavedSearchSavedObject(currentSavedSearch)
      ? i18n.translate(
          'xpack.ml.newJob.wizard.jobType.indexPatternFromSavedSearchNotTimeBasedMessage',
          {
            defaultMessage:
              '{savedSearchTitle} uses index pattern {indexPatternTitle} which is not time based',
            values: {
              savedSearchTitle: currentSavedSearch.attributes.title as string,
              indexPatternTitle: currentIndexPattern.title,
            },
          }
        )
      : i18n.translate('xpack.ml.newJob.wizard.jobType.indexPatternNotTimeBasedMessage', {
          defaultMessage: 'Index pattern {indexPatternTitle} is not time based',
          values: { indexPatternTitle: currentIndexPattern.title },
        });

  const pageTitleLabel = isSavedSearchSavedObject(currentSavedSearch)
    ? i18n.translate('xpack.ml.newJob.wizard.jobType.savedSearchPageTitleLabel', {
        defaultMessage: 'saved search {savedSearchTitle}',
        values: { savedSearchTitle: currentSavedSearch.attributes.title as string },
      })
    : i18n.translate('xpack.ml.newJob.wizard.jobType.indexPatternPageTitleLabel', {
        defaultMessage: 'index pattern {indexPatternTitle}',
        values: { indexPatternTitle: currentIndexPattern.title },
      });

  const recognizerResults = {
    count: 0,
    onChange() {
      setRecognizerResultsCount(recognizerResults.count);
    },
  };

  const getUrlParams = () => {
    return !isSavedSearchSavedObject(currentSavedSearch)
      ? `?index=${currentIndexPattern.id}`
      : `?savedSearchId=${currentSavedSearch.id}`;
  };

  const addSelectionToRecentlyAccessed = () => {
    const title = !isSavedSearchSavedObject(currentSavedSearch)
      ? currentIndexPattern.title
      : (currentSavedSearch.attributes.title as string);
    addItemToRecentlyAccessed('jobs/new_job/datavisualizer', title, '');
    navigateToPath(`/jobs/new_job/datavisualizer${getUrlParams()}`);
  };

  const jobTypes = [
    {
      onClick: () => navigateToPath(`/jobs/new_job/single_metric${getUrlParams()}`),
      icon: {
        type: 'createSingleMetricJob',
        ariaLabel: i18n.translate('xpack.ml.newJob.wizard.jobType.singleMetricAriaLabel', {
          defaultMessage: 'Single metric job',
        }),
      },
      title: i18n.translate('xpack.ml.newJob.wizard.jobType.singleMetricTitle', {
        defaultMessage: 'Single metric',
      }),
      description: i18n.translate('xpack.ml.newJob.wizard.jobType.singleMetricDescription', {
        defaultMessage: 'Detect anomalies in a single time series.',
      }),
      id: 'mlJobTypeLinkSingleMetricJob',
    },
    {
      onClick: () => navigateToPath(`/jobs/new_job/multi_metric${getUrlParams()}`),
      icon: {
        type: 'createMultiMetricJob',
        ariaLabel: i18n.translate('xpack.ml.newJob.wizard.jobType.multiMetricAriaLabel', {
          defaultMessage: 'Multi-metric job',
        }),
      },
      title: i18n.translate('xpack.ml.newJob.wizard.jobType.multiMetricTitle', {
        defaultMessage: 'Multi-metric',
      }),
      description: i18n.translate('xpack.ml.newJob.wizard.jobType.multiMetricDescription', {
        defaultMessage:
          'Detect anomalies with one or more metrics and optionally split the analysis.',
      }),
      id: 'mlJobTypeLinkMultiMetricJob',
    },
    {
      onClick: () => navigateToPath(`/jobs/new_job/population${getUrlParams()}`),
      icon: {
        type: 'createPopulationJob',
        ariaLabel: i18n.translate('xpack.ml.newJob.wizard.jobType.populationAriaLabel', {
          defaultMessage: 'Population job',
        }),
      },
      title: i18n.translate('xpack.ml.newJob.wizard.jobType.populationTitle', {
        defaultMessage: 'Population',
      }),
      description: i18n.translate('xpack.ml.newJob.wizard.jobType.populationDescription', {
        defaultMessage:
          'Detect activity that is unusual compared to the behavior of the population.',
      }),
      id: 'mlJobTypeLinkPopulationJob',
    },
    {
      onClick: () => navigateToPath(`/jobs/new_job/advanced${getUrlParams()}`),
      icon: {
        type: 'createAdvancedJob',
        ariaLabel: i18n.translate('xpack.ml.newJob.wizard.jobType.advancedAriaLabel', {
          defaultMessage: 'Advanced job',
        }),
      },
      title: i18n.translate('xpack.ml.newJob.wizard.jobType.advancedTitle', {
        defaultMessage: 'Advanced',
      }),
      description: i18n.translate('xpack.ml.newJob.wizard.jobType.advancedDescription', {
        defaultMessage:
          'Use the full range of options to create a job for more advanced use cases.',
      }),
      id: 'mlJobTypeLinkAdvancedJob',
    },
    {
      onClick: () => navigateToPath(`/jobs/new_job/categorization${getUrlParams()}`),
      icon: {
        type: CategorizationIcon,
        ariaLabel: i18n.translate('xpack.ml.newJob.wizard.jobType.categorizationAriaLabel', {
          defaultMessage: 'Categorization job',
        }),
      },
      title: i18n.translate('xpack.ml.newJob.wizard.jobType.categorizationTitle', {
        defaultMessage: 'Categorization',
      }),
      description: i18n.translate('xpack.ml.newJob.wizard.jobType.categorizationDescription', {
        defaultMessage: 'Group log messages into categories and detect anomalies within them.',
      }),
      id: 'mlJobTypeLinkCategorizationJob',
    },
  ];

  return (
    <EuiPage data-test-subj="mlPageJobTypeSelection">
      <EuiPageBody restrictWidth={1200}>
        <EuiTitle size="l">
          <h1>
            <FormattedMessage
              id="xpack.ml.newJob.wizard.jobType.createJobFromTitle"
              defaultMessage="Create a job from the {pageTitleLabel}"
              values={{ pageTitleLabel }}
            />
          </h1>
        </EuiTitle>
        <EuiSpacer />

        {isTimeBasedIndex === false && (
          <>
            <EuiCallOut title={indexWarningTitle} color="warning" iconType="alert">
              <FormattedMessage
                id="xpack.ml.newJob.wizard.jobType.howToRunAnomalyDetectionDescription"
                defaultMessage="Anomaly detection can only be run over indices which are time based."
              />
              <br />
              <EuiLink onClick={onSelectDifferentIndex}>
                <FormattedMessage
                  id="xpack.ml.newJob.wizard.jobType.selectDifferentIndexLinkText"
                  defaultMessage="Select a different index"
                />
              </EuiLink>
            </EuiCallOut>
            <EuiSpacer size="xxl" />
          </>
        )}

        <div hidden={recognizerResultsCount === 0}>
          <EuiTitle size="s">
            <h2>
              <FormattedMessage
                id="xpack.ml.newJob.wizard.jobType.useSuppliedConfigurationTitle"
                defaultMessage="Use preconfigured jobs"
              />
            </h2>
          </EuiTitle>
          <EuiSpacer size="s" />
          <EuiText>
            <p>
              <FormattedMessage
                id="xpack.ml.newJob.wizard.jobType.useSuppliedConfigurationDescription"
                defaultMessage="The fields in your data match known configurations.
                Create a set of preconfigured jobs."
              />
            </p>
          </EuiText>

          <EuiSpacer size="m" />

          <EuiFlexGrid gutterSize="l" columns={4}>
            <DataRecognizer
              indexPattern={currentIndexPattern}
              savedSearch={currentSavedSearch}
              results={recognizerResults}
            />
          </EuiFlexGrid>

          <EuiSpacer size="xxl" />
        </div>

        <EuiTitle size="s">
          <h2>
            <FormattedMessage
              id="xpack.ml.newJob.wizard.jobType.useWizardTitle"
              defaultMessage="Use a wizard"
            />
          </h2>
        </EuiTitle>
        <EuiSpacer size="m" />

        <EuiFlexGrid gutterSize="l" columns={4}>
          {jobTypes.map(({ onClick, icon, title, description, id }) => (
            <EuiFlexItem key={id}>
              <CreateJobLinkCard
                data-test-subj={id}
                onClick={onClick}
                icon={icon.type}
                iconAreaLabel={icon.ariaLabel}
                title={title}
                description={description}
                isDisabled={!isTimeBasedIndex}
              />
            </EuiFlexItem>
          ))}
        </EuiFlexGrid>

        <EuiSpacer size="xxl" />

        <EuiText>
          <EuiTitle size="s">
            <h3>
              <FormattedMessage
                id="xpack.ml.newJob.wizard.jobType.learnMoreAboutDataTitle"
                defaultMessage="Learn more about your data"
              />
            </h3>
          </EuiTitle>

          <p>
            <FormattedMessage
              id="xpack.ml.newJob.wizard.jobType.learnMoreAboutDataDescription"
              defaultMessage="If you're not sure what type of job to create, first explore the fields and metrics in your data."
            />
          </p>
        </EuiText>

        <EuiSpacer size="m" />

        <EuiFlexGrid gutterSize="l" columns={4}>
          <EuiFlexItem>
            <CreateJobLinkCard
              icon="dataVisualizer"
              iconAreaLabel={i18n.translate(
                'xpack.ml.newJob.wizard.jobType.dataVisualizerAriaLabel',
                {
                  defaultMessage: 'Data Visualizer',
                }
              )}
              title={
                <FormattedMessage
                  id="xpack.ml.newJob.wizard.jobType.dataVisualizerTitle"
                  defaultMessage="Data Visualizer"
                />
              }
              description={
                <FormattedMessage
                  id="xpack.ml.newJob.wizard.jobType.dataVisualizerDescription"
                  defaultMessage="Learn more about the characteristics of your data and identify the fields for analysis with machine learning."
                />
              }
              onClick={addSelectionToRecentlyAccessed}
            />
          </EuiFlexItem>
        </EuiFlexGrid>
      </EuiPageBody>
    </EuiPage>
  );
};
