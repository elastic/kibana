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

import type { EmbeddableSloProps, SloAlertsEmbeddableInput } from './types';

interface SloConfigurationProps {
  initialInput?: Partial<SloAlertsEmbeddableInput>;
  onCreate: (props: EmbeddableSloProps) => void; // TODO check change point detection
  onCancel: () => void;
}

export function SloConfiguration({ initialInput, onCreate, onCancel }: SloConfigurationProps) {
  console.log(initialInput, '!!initialInput');
  const slos = initialInput?.slos;
  console.log(slos, '!!slos');
  const [selectedSlos, setSelectedSlos] = useState<EmbeddableSloProps>(slos);
  const onConfirmClick = () => onCreate({ slos: selectedSlos });
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
              initialSlos={selectedSlos}
              hasError={hasError}
              onSelected={(slos) => {
                if (slos === undefined) {
                  setHasError(true);
                } else {
                  setHasError(false);
                }
                setSelectedSlos(
                  slos?.map((slo) => ({
                    id: slo?.id,
                    instanceId: slo?.instanceId,
                    name: slo?.name,
                  }))
                );
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
          isDisabled={!selectedSlos || hasError}
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
