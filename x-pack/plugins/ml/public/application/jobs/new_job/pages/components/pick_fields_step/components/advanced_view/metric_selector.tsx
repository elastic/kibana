/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { Fragment } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiFormRow, EuiFlexGroup, EuiFlexItem, EuiButton } from '@elastic/eui';
import type { Aggregation, Field } from '@kbn/ml-anomaly-utils';
import type { ModalPayload } from '../advanced_detector_modal';
import { AdvancedDetectorModal } from '../advanced_detector_modal';
import type { RichDetector } from '../../../../../common/job_creator/advanced_job_creator';

interface Props {
  payload: ModalPayload | null;
  fields: Field[];
  aggs: Aggregation[];
  detectorChangeHandler: (dtr: RichDetector) => void;
  closeModal(): void;
  showModal(): void;
}

const MAX_WIDTH = 560;

export const MetricSelector: FC<Props> = ({
  payload,
  fields,
  aggs,
  detectorChangeHandler,
  closeModal,
  showModal,
}) => {
  return (
    <Fragment>
      <EuiFlexGroup style={{ maxWidth: MAX_WIDTH }}>
        <EuiFlexItem>
          <EuiFormRow>
            <EuiButton onClick={showModal} data-test-subj="mlAddDetectorButton">
              <FormattedMessage
                id="xpack.ml.newJob.wizard.pickFieldsStep.addDetectorButton"
                defaultMessage="Add detector"
              />
            </EuiButton>
          </EuiFormRow>
        </EuiFlexItem>
      </EuiFlexGroup>

      {payload !== null && (
        <AdvancedDetectorModal
          payload={payload}
          fields={fields}
          aggs={aggs}
          detectorChangeHandler={detectorChangeHandler}
          closeModal={closeModal}
        />
      )}
    </Fragment>
  );
};
