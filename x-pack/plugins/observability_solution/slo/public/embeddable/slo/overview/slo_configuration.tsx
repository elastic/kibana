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
  EuiSwitch,
  EuiSpacer,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { ALL_VALUE } from '@kbn/slo-schema';
import { i18n } from '@kbn/i18n';
import { SloSelector } from '../alerts/slo_selector';
import type { EmbeddableSloProps } from './types';

interface SloConfigurationProps {
  onCreate: (props: EmbeddableSloProps) => void;
  onCancel: () => void;
}

export function SloConfiguration({ onCreate, onCancel }: SloConfigurationProps) {
  const [selectedSlo, setSelectedSlo] = useState<EmbeddableSloProps>();
  const [showAllGroupByInstances, setShowAllGroupByInstances] = useState(false);

  const onConfirmClick = () =>
    onCreate({
      showAllGroupByInstances,
      sloId: selectedSlo?.sloId,
      sloInstanceId: selectedSlo?.sloInstanceId,
    });
  const [hasError, setHasError] = useState(false);

  return (
    <EuiModal onClose={onCancel} style={{ minWidth: 550 }}>
      <EuiModalHeader>
        <EuiModalHeaderTitle>
          {i18n.translate('xpack.slo.sloEmbeddable.config.sloSelector.headerTitle', {
            defaultMessage: 'SLO configuration',
          })}
        </EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>
        <EuiFlexGroup>
          <EuiFlexItem grow>
            <SloSelector
              singleSelection={true}
              hasError={hasError}
              onSelected={(slo) => {
                setHasError(slo === undefined);
                if (slo && 'id' in slo) {
                  setSelectedSlo({ sloId: slo.id, sloInstanceId: slo.instanceId });
                }
              }}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
        {selectedSlo?.sloInstanceId !== ALL_VALUE && (
          <>
            <EuiSpacer />
            <EuiSwitch
              label={i18n.translate('xpack.slo.sloConfiguration.euiSwitch.showAllGroupByLabel', {
                defaultMessage: 'Show all related group-by instances',
              })}
              checked={showAllGroupByInstances}
              onChange={(e) => {
                setShowAllGroupByInstances(e.target.checked);
              }}
            />
          </>
        )}
      </EuiModalBody>
      <EuiModalFooter>
        <EuiButtonEmpty onClick={onCancel} data-test-subj="sloCancelButton">
          <FormattedMessage
            id="xpack.slo.sloEmbeddable.config.cancelButtonLabel"
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
            id="xpack.slo.embeddableSlo.config.confirmButtonLabel"
            defaultMessage="Confirm configurations"
          />
        </EuiButton>
      </EuiModalFooter>
    </EuiModal>
  );
}
