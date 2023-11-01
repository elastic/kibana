/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
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
import { i18n } from '@kbn/i18n';
import { SloSelector } from './slo_selector';
import type { EmbeddableSloProps } from './types';

interface SloConfigurationProps {
  onCreate: (props: EmbeddableSloProps) => void;
  onCancel: () => void;
}

export function SloConfiguration({ onCreate, onCancel }: SloConfigurationProps) {
  const [selectedSlo, setSelectedSlo] = useState<EmbeddableSloProps>();
  const onConfirmClick = () =>
    onCreate({ sloId: selectedSlo?.sloId, sloInstanceId: selectedSlo?.sloInstanceId });
  const [hasError, setHasError] = useState(false);

  return (
    <EuiModal onClose={onCancel} style={{ minWidth: 550 }}>
      <EuiModalHeader>
        <EuiModalHeaderTitle>
          {i18n.translate('xpack.observability.sloEmbeddable.config.sloSelector.headerTitle', {
            defaultMessage: 'SLO configuration',
          })}
        </EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>
        <EuiFlexGroup>
          <EuiFlexItem grow>
            <SloSelector
              hasError={hasError}
              onSelected={(slo) => {
                if (slo === undefined) {
                  setHasError(true);
                } else {
                  setHasError(false);
                }
                setSelectedSlo({ sloId: slo?.id, sloInstanceId: slo?.instanceId });
              }}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiModalBody>
      <EuiModalFooter>
        <EuiButtonEmpty onClick={onCancel} data-test-subj="sloCancelButton">
          <FormattedMessage
            id="xpack.observability.sloEmbeddable.config.cancelButtonLabel"
            defaultMessage="Cancel"
          />
        </EuiButtonEmpty>

        <EuiButton
          data-test-subj="sloConfirmButton"
          isDisabled={!selectedSlo || hasError}
          onClick={onConfirmClick}
          fill
        >
          <FormattedMessage
            id="xpack.observability.embeddableSlo.config.confirmButtonLabel"
            defaultMessage="Confirm configurations"
          />
        </EuiButton>
      </EuiModalFooter>
    </EuiModal>
  );
}
