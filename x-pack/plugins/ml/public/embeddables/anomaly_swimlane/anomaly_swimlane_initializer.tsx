/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, useState } from 'react';
import {
  EuiForm,
  EuiFormRow,
  EuiFieldText,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiModalBody,
  EuiButton,
  EuiModalFooter,
  EuiButtonEmpty,
} from '@elastic/eui';

export interface AnomalySwimlaneInitializerProps {
  onCreate: (swimlaneProps: { jobId: string; viewBy: string }) => void;
  onCancel: () => void;
}

export const AnomalySwimlaneInitializer: FC<AnomalySwimlaneInitializerProps> = ({
  onCreate,
  onCancel,
}) => {
  const [jobId, setJobId] = useState('');
  const [viewBy, setViewBy] = useState('');

  return (
    <div>
      <EuiModalHeader>
        <EuiModalHeaderTitle>Create ML anomaly swimlane</EuiModalHeaderTitle>
      </EuiModalHeader>

      <EuiModalBody>
        <EuiForm>
          <EuiFormRow label="Job ID">
            <EuiFieldText
              name="popfirst"
              value={jobId}
              onChange={e => {
                setJobId(e.target.value);
              }}
            />
          </EuiFormRow>
          <EuiFormRow label="View by">
            <EuiFieldText
              name="popfirst"
              value={viewBy}
              onChange={e => setViewBy(e.target.value)}
            />
          </EuiFormRow>
        </EuiForm>
      </EuiModalBody>

      <EuiModalFooter>
        <EuiButtonEmpty onClick={onCancel}>Cancel</EuiButtonEmpty>

        <EuiButton
          isDisabled={!jobId && !viewBy}
          onClick={() => {
            if (jobId && viewBy) {
              onCreate({ jobId, viewBy });
            }
          }}
          fill
        >
          Create
        </EuiButton>
      </EuiModalFooter>
    </div>
  );
};
