/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, useState } from 'react';

import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';
import { EuiSpacer, EuiText, EuiTitle, EuiFlexGroup } from '@elastic/eui';
import { Link } from 'react-router-dom';
import { IndexPattern } from '../../../../../../../../../src/plugins/data/public';
import { CreateJobLinkCard } from '../../../../components/create_job_link_card';
import { DataRecognizer } from '../../../../components/data_recognizer';
import { ML_PAGES } from '../../../../../../common/constants/ml_url_generator';

interface Props {
  indexPattern: IndexPattern;
}

export const ActionsPanel: FC<Props> = ({ indexPattern }) => {
  const [recognizerResultsCount, setRecognizerResultsCount] = useState(0);

  const recognizerResults = {
    count: 0,
    onChange() {
      setRecognizerResultsCount(recognizerResults.count);
    },
  };
  const createJobLink = `/${ML_PAGES.ANOMALY_DETECTION_CREATE_JOB}/advanced?index=${indexPattern.id}`;

  // Note we use display:none for the DataRecognizer section as it needs to be
  // passed the recognizerResults object, and then run the recognizer check which
  // controls whether the recognizer section is ultimately displayed.
  return (
    <div data-test-subj="mlDataVisualizerActionsPanel">
      <EuiTitle size="s">
        <h2>
          <FormattedMessage
            id="xpack.ml.datavisualizer.actionsPanel.createJobTitle"
            defaultMessage="Create Job"
          />
        </h2>
      </EuiTitle>
      <EuiSpacer size="s" />
      <div style={recognizerResultsCount === 0 ? { display: 'none' } : {}}>
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
          description={i18n.translate('xpack.ml.datavisualizer.actionsPanel.advancedDescription', {
            defaultMessage:
              'Use the full range of options to create a job for more advanced use cases',
          })}
          data-test-subj="mlDataVisualizerCreateAdvancedJobCard"
        />
      </Link>
    </div>
  );
};
