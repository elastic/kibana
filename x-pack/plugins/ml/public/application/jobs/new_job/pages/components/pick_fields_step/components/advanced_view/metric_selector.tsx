/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, Fragment } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiFormRow, EuiFlexGroup, EuiFlexItem, EuiButton } from '@elastic/eui';
import { Aggregation, Field } from '../../../../../../../../../common/types/fields';
import { AdvancedDetectorModal, ModalPayload } from '../advanced_detector_modal';
import { RichDetector } from '../../../../../common/job_creator/advanced_job_creator';

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
