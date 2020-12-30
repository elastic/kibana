/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, FC, useEffect, useState, useContext } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import {
  EuiFlyout,
  EuiFlyoutFooter,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButton,
  EuiButtonEmpty,
  EuiTitle,
  EuiFlyoutBody,
  EuiSpacer,
} from '@elastic/eui';
import { MLJobEditor } from '../../../../../jobs_list/components/ml_job_editor';
import { isValidJson } from '../../../../../../../../common/util/validation_utils';
import { JobCreatorContext } from '../../job_creator_context';
import { CategorizationJobCreator } from '../../../../common/job_creator';
import { getNewJobDefaults } from '../../../../../../services/ml_server_info';

const EDITOR_HEIGHT = '800px';

export const EditCategorizationAnalyzerFlyout: FC = () => {
  const { jobCreator: jc, jobCreatorUpdate } = useContext(JobCreatorContext);
  const jobCreator = jc as CategorizationJobCreator;
  const [showJsonFlyout, setShowJsonFlyout] = useState(false);
  const [saveable, setSaveable] = useState(false);

  const [categorizationAnalyzerString, setCategorizationAnalyzerString] = useState(
    JSON.stringify(jobCreator.categorizationAnalyzer, null, 2)
  );

  useEffect(() => {
    if (showJsonFlyout === true) {
      setCategorizationAnalyzerString(JSON.stringify(jobCreator.categorizationAnalyzer, null, 2));
    }
  }, [showJsonFlyout]);

  function toggleJsonFlyout() {
    setSaveable(false);
    setShowJsonFlyout(!showJsonFlyout);
  }

  function onJSONChange(json: string) {
    setCategorizationAnalyzerString(json);
    const valid = isValidJson(json);
    setSaveable(valid);
  }

  function onSave() {
    jobCreator.categorizationAnalyzer = JSON.parse(categorizationAnalyzerString);
    jobCreatorUpdate();
    setShowJsonFlyout(false);
  }

  function onUseDefault() {
    const { anomaly_detectors: anomalyDetectors } = getNewJobDefaults();
    const analyzerString = JSON.stringify(anomalyDetectors.categorization_analyzer!, null, 2);
    onJSONChange(analyzerString);
  }

  return (
    <Fragment>
      <FlyoutButton onClick={toggleJsonFlyout} />

      {showJsonFlyout === true && (
        <EuiFlyout onClose={() => setShowJsonFlyout(false)} hideCloseButton size="m">
          <EuiFlyoutBody>
            <Contents
              onChange={onJSONChange}
              title={i18n.translate('xpack.ml.newJob.wizard.categorizationAnalyzerFlyout.title', {
                defaultMessage: 'Edit categorization analyzer JSON',
              })}
              value={categorizationAnalyzerString}
            />
          </EuiFlyoutBody>
          <EuiFlyoutFooter>
            <EuiFlexGroup justifyContent="spaceBetween">
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty
                  iconType="cross"
                  onClick={() => setShowJsonFlyout(false)}
                  flush="left"
                >
                  <FormattedMessage
                    id="xpack.ml.newJob.wizard.categorizationAnalyzerFlyout.closeButton"
                    defaultMessage="Close"
                  />
                </EuiButtonEmpty>
              </EuiFlexItem>
              <EuiFlexItem grow={true} />
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty onClick={onUseDefault}>
                  <FormattedMessage
                    id="xpack.ml.newJob.wizard.categorizationAnalyzerFlyout.useDefaultButton"
                    defaultMessage="Use default ML analyzer"
                  />
                </EuiButtonEmpty>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButton onClick={onSave} fill isDisabled={saveable === false}>
                  <FormattedMessage
                    id="xpack.ml.newJob.wizard.categorizationAnalyzerFlyout.saveButton"
                    defaultMessage="Save"
                  />
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlyoutFooter>
        </EuiFlyout>
      )}
    </Fragment>
  );
};

const FlyoutButton: FC<{ onClick(): void }> = ({ onClick }) => {
  return (
    <EuiButtonEmpty onClick={onClick} flush="left" data-test-subj="mlJobWizardButtonPreviewJobJson">
      <FormattedMessage
        id="xpack.ml.newJob.wizard.editCategorizationAnalyzerFlyoutButton"
        defaultMessage="Edit categorization analyzer"
      />
    </EuiButtonEmpty>
  );
};

const Contents: FC<{
  title: string;
  value: string;
  onChange(s: string): void;
}> = ({ title, value, onChange }) => {
  return (
    <EuiFlexItem>
      <EuiTitle size="s">
        <h5>{title}</h5>
      </EuiTitle>
      <EuiSpacer size="s" />
      <MLJobEditor value={value} height={EDITOR_HEIGHT} readOnly={false} onChange={onChange} />
    </EuiFlexItem>
  );
};
