/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, useState, useEffect } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiFlexGroup, EuiFlexItem, EuiTitle, EuiSpacer, EuiLoadingSpinner } from '@elastic/eui';

import { CombinedJob } from '../../../../../../../../common/types/anomaly_detection_jobs';
import { MLJobEditor } from '../../../../../jobs_list/components/ml_job_editor';
import { mlJobService } from '../../../../../../services/job_service';
import { ML_DATA_PREVIEW_COUNT } from '../../../../../../../../common/util/job_utils';

const EDITOR_HEIGHT = '800px';

export const DatafeedPreview: FC<{
  combinedJob: CombinedJob | null;
}> = ({ combinedJob }) => {
  const [loading, setLoading] = useState(false);
  const [previewJsonString, setPreviewJsonString] = useState('');

  useEffect(() => {
    loadDataPreview();
  }, []);

  useEffect(() => {
    loadDataPreview();
  }, [combinedJob]);
  // }, [JSON.stringify(combinedJob)]);

  async function loadDataPreview() {
    setPreviewJsonString('');
    if (combinedJob === null) {
      return;
    }

    setLoading(true);

    if (combinedJob.datafeed_config && combinedJob.datafeed_config.indices.length) {
      try {
        const resp = await mlJobService.searchPreview(combinedJob);
        const data = resp.aggregations
          ? resp.aggregations.buckets.buckets.slice(0, ML_DATA_PREVIEW_COUNT)
          : resp.hits.hits;

        setPreviewJsonString(JSON.stringify(data, null, 2));
      } catch (error) {
        setPreviewJsonString(JSON.stringify(error, null, 2));
      }
      setLoading(false);
    } else {
      const errorText = i18n.translate(
        'xpack.ml.newJob.wizard.datafeedPreviewFlyout.datafeedDoesNotExistLabel',
        {
          defaultMessage: 'Datafeed does not exist',
        }
      );
      setPreviewJsonString(errorText);
    }
  }

  return (
    <EuiFlexItem>
      <EuiTitle size="s">
        <h5>
          <FormattedMessage
            id="xpack.ml.newJob.wizard.datafeedPreviewFlyout.title"
            defaultMessage="Datafeed preview"
          />
        </h5>
      </EuiTitle>
      <EuiSpacer size="s" />
      {loading === true ? (
        <EuiFlexGroup justifyContent="spaceAround">
          <EuiFlexItem grow={false}>
            <EuiSpacer size="xxl" />
            <EuiLoadingSpinner size="l" />
          </EuiFlexItem>
        </EuiFlexGroup>
      ) : (
        <MLJobEditor value={previewJsonString} height={EDITOR_HEIGHT} readOnly={true} />
      )}
    </EuiFlexItem>
  );
};
