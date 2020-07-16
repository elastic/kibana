/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, FC, useState, useContext, useEffect } from 'react';
import { debounce } from 'lodash';
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
  EuiCallOut,
} from '@elastic/eui';
import { collapseLiteralStrings } from '../../../../../../../../shared_imports';
import { CombinedJob, Datafeed } from '../../../../../../../../common/types/anomaly_detection_jobs';
import { ML_EDITOR_MODE, MLJobEditor } from '../../../../../jobs_list/components/ml_job_editor';
import { isValidJson } from '../../../../../../../../common/util/validation_utils';
import { JobCreatorContext } from '../../job_creator_context';
import { DatafeedPreview } from '../datafeed_preview_flyout';

const EDITOR_HEIGHT = '800px';
export enum EDITOR_MODE {
  HIDDEN,
  READONLY,
  EDITABLE,
}
interface Props {
  isDisabled: boolean;
  jobEditorMode: EDITOR_MODE;
  datafeedEditorMode: EDITOR_MODE;
}
export const JsonEditorFlyout: FC<Props> = ({ isDisabled, jobEditorMode, datafeedEditorMode }) => {
  const { jobCreator, jobCreatorUpdate, jobCreatorUpdated } = useContext(JobCreatorContext);
  const [showJsonFlyout, setShowJsonFlyout] = useState(false);
  const [showChangedIndicesWarning, setShowChangedIndicesWarning] = useState(false);

  const [jobConfigString, setJobConfigString] = useState(jobCreator.formattedJobJson);
  const [datafeedConfigString, setDatafeedConfigString] = useState(
    jobCreator.formattedDatafeedJson
  );
  const [saveable, setSaveable] = useState(false);
  const [tempCombinedJob, setTempCombinedJob] = useState<CombinedJob | null>(null);

  useEffect(() => {
    setJobConfigString(jobCreator.formattedJobJson);
    setDatafeedConfigString(jobCreator.formattedDatafeedJson);
  }, [jobCreatorUpdated]);

  useEffect(() => {
    if (showJsonFlyout === true) {
      // when the flyout opens, update the JSON
      setJobConfigString(jobCreator.formattedJobJson);
      setDatafeedConfigString(jobCreator.formattedDatafeedJson);
      setShowChangedIndicesWarning(false);
      debounceSetCombinedJob(jobCreator.formattedJobJson, jobCreator.formattedDatafeedJson, true);
    }
  }, [showJsonFlyout]);

  const editJsonMode = false;
  // jobEditorMode === EDITOR_MODE.HIDDEN || datafeedEditorMode === EDITOR_MODE.HIDDEN;
  const flyOutSize = editJsonMode ? 'm' : 'l';
  const readOnlyMode =
    jobEditorMode === EDITOR_MODE.READONLY && datafeedEditorMode === EDITOR_MODE.READONLY;

  function toggleJsonFlyout() {
    setSaveable(false);
    setShowJsonFlyout(!showJsonFlyout);
  }

  function onJobChange(json: string) {
    setJobConfigString(json);
    const valid = isValidJson(json);
    setSaveable(valid);
  }

  function onDatafeedChange(json: string) {
    setDatafeedConfigString(json);
    const jsonValue = collapseLiteralStrings(json);
    let valid = isValidJson(jsonValue);
    if (valid) {
      // ensure that the user hasn't altered the indices list in the json.
      const { indices }: Datafeed = JSON.parse(jsonValue);
      const originalIndices = jobCreator.indices.sort();
      valid =
        originalIndices.length === indices.length &&
        originalIndices.every((value, index) => value === indices[index]);
      setShowChangedIndicesWarning(valid === false);
    } else {
      setShowChangedIndicesWarning(false);
    }
    setSaveable(valid);
  }

  const debounceSetCombinedJob = debounce((job: string, datafeed: string, saveable2: boolean) => {
    setTempCombinedJob(
      saveable2
        ? {
            ...JSON.parse(job),
            datafeed_config: JSON.parse(datafeed),
          }
        : null
    );
  }, 500);

  useEffect(() => {
    debounceSetCombinedJob(jobConfigString, datafeedConfigString, saveable);
    return () => {
      debounceSetCombinedJob.cancel();
    };
  }, [datafeedConfigString, saveable]);

  function onSave() {
    const jobConfig = JSON.parse(jobConfigString);
    const datafeedConfig = JSON.parse(collapseLiteralStrings(datafeedConfigString));
    jobCreator.cloneFromExistingJob(jobConfig, datafeedConfig);
    jobCreatorUpdate();
    setShowJsonFlyout(false);
  }

  return (
    <Fragment>
      <FlyoutButton
        onClick={toggleJsonFlyout}
        isDisabled={isDisabled}
        editJsonMode={editJsonMode}
      />

      {showJsonFlyout === true && isDisabled === false && (
        <EuiFlyout onClose={() => setShowJsonFlyout(false)} hideCloseButton size={flyOutSize}>
          <EuiFlyoutBody>
            <EuiFlexGroup>
              {jobEditorMode !== EDITOR_MODE.HIDDEN && (
                <Contents
                  editJson={jobEditorMode === EDITOR_MODE.EDITABLE}
                  onChange={onJobChange}
                  title={i18n.translate('xpack.ml.newJob.wizard.jsonFlyout.job.title', {
                    defaultMessage: 'Job configuration JSON',
                  })}
                  value={jobConfigString}
                />
              )}
              {datafeedEditorMode !== EDITOR_MODE.HIDDEN && (
                <>
                  <Contents
                    editJson={datafeedEditorMode === EDITOR_MODE.EDITABLE}
                    onChange={onDatafeedChange}
                    title={i18n.translate('xpack.ml.newJob.wizard.jsonFlyout.datafeed.title', {
                      defaultMessage: 'Datafeed configuration JSON',
                    })}
                    value={datafeedConfigString}
                  />
                  <EuiFlexItem>
                    <DatafeedPreview combinedJob={tempCombinedJob} />
                  </EuiFlexItem>
                </>
              )}
            </EuiFlexGroup>
            {showChangedIndicesWarning && (
              <>
                <EuiSpacer />
                <EuiCallOut
                  color="warning"
                  size="s"
                  title={i18n.translate(
                    'xpack.ml.newJob.wizard.jsonFlyout.indicesChange.calloutTitle',
                    {
                      defaultMessage: 'Indices have changed',
                    }
                  )}
                >
                  <FormattedMessage
                    id="xpack.ml.newJob.wizard.jsonFlyout.indicesChange.calloutText"
                    defaultMessage="It is not possible to alter the indices being used by the datafeed here. If you wish to use a different index, please start the job creation again select a different index pattern."
                  />
                </EuiCallOut>
              </>
            )}
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
                    id="xpack.ml.newJob.wizard.jsonFlyout.closeButton"
                    defaultMessage="Close"
                  />
                </EuiButtonEmpty>
              </EuiFlexItem>
              {readOnlyMode === false && (
                <EuiFlexItem grow={false}>
                  <EuiButton onClick={onSave} fill isDisabled={saveable === false}>
                    <FormattedMessage
                      id="xpack.ml.newJob.wizard.jsonFlyout.saveButton"
                      defaultMessage="Save"
                    />
                  </EuiButton>
                </EuiFlexItem>
              )}
            </EuiFlexGroup>
          </EuiFlyoutFooter>
        </EuiFlyout>
      )}
    </Fragment>
  );
};

const FlyoutButton: FC<{ isDisabled: boolean; onClick(): void; editJsonMode: boolean }> = ({
  isDisabled,
  onClick,
  editJsonMode,
}) => {
  const previewJsonTitle = i18n.translate('xpack.ml.newJob.wizard.previewJsonButton', {
    defaultMessage: 'Preview JSON',
  });
  const editJsonTitle = i18n.translate('xpack.ml.newJob.wizard.editJsonButton', {
    defaultMessage: 'Edit JSON',
  });
  return (
    <EuiButtonEmpty
      onClick={onClick}
      isDisabled={isDisabled}
      data-test-subj="mlJobWizardButtonPreviewJobJson"
    >
      {editJsonMode ? editJsonTitle : previewJsonTitle}
    </EuiButtonEmpty>
  );
};

const Contents: FC<{
  title: string;
  value: string;
  editJson: boolean;
  onChange(s: string): void;
}> = ({ title, value, editJson, onChange }) => {
  return (
    <EuiFlexItem>
      <EuiTitle size="s">
        <h5>{title}</h5>
      </EuiTitle>
      <EuiSpacer size="s" />
      <MLJobEditor
        value={value}
        height={EDITOR_HEIGHT}
        mode={ML_EDITOR_MODE.XJSON}
        readOnly={editJson === false}
        onChange={onChange}
      />
    </EuiFlexItem>
  );
};
