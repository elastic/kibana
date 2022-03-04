/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useState, useEffect, useMemo, useCallback } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiTitle,
  EuiSpacer,
  EuiLoadingSpinner,
  EuiButton,
} from '@elastic/eui';

import { CombinedJob } from '../../../../../../../../common/types/anomaly_detection_jobs';
import { MLJobEditor } from '../../../../../jobs_list/components/ml_job_editor';
import { useMlApiContext } from '../../../../../../contexts/kibana';

export const DatafeedPreview: FC<{
  combinedJob: CombinedJob | null;
  heightOffset?: number;
}> = ({ combinedJob, heightOffset = 0 }) => {
  const {
    jobs: { datafeedPreview },
  } = useMlApiContext();
  // the ace editor requires a fixed height
  const editorHeight = useMemo(
    () => `${window.innerHeight - 230 - heightOffset}px`,
    [heightOffset]
  );
  const [loading, setLoading] = useState(false);
  const [previewJsonString, setPreviewJsonString] = useState('');
  const [outOfDate, setOutOfDate] = useState(false);
  const [combinedJobString, setCombinedJobString] = useState('');

  useEffect(() => {
    try {
      if (combinedJob !== null) {
        if (combinedJobString === '') {
          // first time, set the string and load the preview
          loadDataPreview();
        } else {
          setOutOfDate(JSON.stringify(combinedJob) !== combinedJobString);
        }
      }
    } catch (error) {
      // fail silently
    }
  }, [combinedJob]);

  const loadDataPreview = useCallback(async () => {
    setPreviewJsonString('');
    if (combinedJob === null) {
      return;
    }

    setLoading(true);
    setCombinedJobString(JSON.stringify(combinedJob));

    if (combinedJob.datafeed_config && combinedJob.datafeed_config.indices.length) {
      try {
        const { datafeed_config: datafeed, ...job } = combinedJob;
        if (job.analysis_config.detectors.length === 0) {
          setPreviewJsonString(
            i18n.translate('xpack.ml.newJob.wizard.datafeedPreviewFlyout.noDetectors', {
              defaultMessage: 'No detectors configured',
            })
          );
        } else {
          const preview = await datafeedPreview(undefined, job, datafeed);
          setPreviewJsonString(JSON.stringify(preview, null, 2));
        }
      } catch (error) {
        setPreviewJsonString(JSON.stringify(error, null, 2));
      }
      setLoading(false);
      setOutOfDate(false);
    } else {
      const errorText = i18n.translate(
        'xpack.ml.newJob.wizard.datafeedPreviewFlyout.datafeedDoesNotExistLabel',
        {
          defaultMessage: 'Datafeed does not exist',
        }
      );
      setPreviewJsonString(errorText);
    }
  }, [combinedJob]);

  return (
    <EuiFlexItem>
      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiTitle size="s">
            <h5>
              <FormattedMessage
                id="xpack.ml.newJob.wizard.datafeedPreviewFlyout.title"
                defaultMessage="Datafeed preview"
              />
            </h5>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          {outOfDate && (
            <EuiButton size="s" onClick={loadDataPreview} iconType="refresh">
              Refresh
            </EuiButton>
          )}
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="s" />
      {loading === true ? (
        <EuiFlexGroup justifyContent="spaceAround">
          <EuiFlexItem grow={false}>
            <EuiSpacer size="xxl" />
            <EuiLoadingSpinner size="l" />
          </EuiFlexItem>
        </EuiFlexGroup>
      ) : (
        <MLJobEditor value={previewJsonString} height={editorHeight} readOnly={true} />
      )}
    </EuiFlexItem>
  );
};
