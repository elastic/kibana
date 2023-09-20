/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useMemo } from 'react';
import {
  EuiModal,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiModalBody,
  EuiModalFooter,
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { SloSelector } from './slo_selector';
import type { SloConfigurationProps, EmbeddableSloProps } from './types';

export function SloConfiguration({ onCreate, onCancel }: SloConfigurationProps) {
  const [selectedSlo, setSelectedSlo] = useState<EmbeddableSloProps>();
  const updatedProps = useMemo(() => {
    return {
      ...selectedSlo,
      title: 'SLO overview',
    };
  }, [selectedSlo]);
  return (
    <EuiModal onClose={onCancel}>
      <EuiModalHeader>
        <EuiModalHeaderTitle>SLO configuration</EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>
        <EuiFlexGroup>
          <EuiFlexItem grow>
            <SloSelector
              onSelected={(slo) => {
                setSelectedSlo({ sloId: slo.id, sloInstanceId: slo.instanceId });
              }}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiModalBody>
      <EuiModalFooter>
        <EuiButtonEmpty onClick={onCancel} data-test-subj="sloCancelButton">
          <FormattedMessage
            id="xpack.aiops.embeddableChangePointChart.setupModal.cancelButtonLabel"
            defaultMessage="Cancel"
          />
        </EuiButtonEmpty>

        <EuiButton
          data-test-subj="sloConfirmButton"
          onClick={onCreate.bind(null, updatedProps)}
          fill
        >
          <FormattedMessage
            id="xpack.observability.embeddableSlo.setupModal.confirmButtonLabel"
            defaultMessage="Confirm configurations"
          />
        </EuiButton>
      </EuiModalFooter>
    </EuiModal>
  );
}
