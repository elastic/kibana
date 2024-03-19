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
  EuiSpacer,
  EuiSwitch,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { ALL_VALUE } from '@kbn/slo-schema';

import { SloSelector } from './slo_selector';
import type { EmbeddableSloProps, SloAlertsEmbeddableInput, SloItem } from './types';

interface SloConfigurationProps {
  initialInput?: Partial<SloAlertsEmbeddableInput>;
  onCreate: (props: EmbeddableSloProps) => void; // TODO check change point detection
  onCancel: () => void;
}

export function SloConfiguration({ initialInput, onCreate, onCancel }: SloConfigurationProps) {
  const [showAllGroupByInstances, setShowAllGroupByInstances] = useState(
    initialInput?.showAllGroupByInstances ?? false
  );
  const [selectedSlos, setSelectedSlos] = useState(initialInput?.slos ?? []);

  const [hasError, setHasError] = useState(false);

  const onConfirmClick = () => onCreate({ slos: selectedSlos, showAllGroupByInstances });

  const hasGroupBy = selectedSlos?.some((slo) => slo.instanceId !== ALL_VALUE);

  return (
    <EuiModal
      onClose={onCancel}
      css={`
        min-width: 550px;
      `}
    >
      <EuiModalHeader>
        <EuiModalHeaderTitle>
          {i18n.translate('xpack.slo.sloEmbeddable.config.sloSelector.headerTitle', {
            defaultMessage: 'SLO configuration',
          })}{' '}
        </EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>
        <EuiFlexGroup>
          <EuiFlexItem grow>
            <SloSelector
              initialSlos={selectedSlos}
              hasError={hasError}
              singleSelection={false}
              onSelected={(slos) => {
                setHasError(slos === undefined);
                if (Array.isArray(slos)) {
                  setSelectedSlos(
                    slos?.map((slo) => ({
                      id: slo?.id,
                      instanceId: slo?.instanceId,
                      name: slo?.name,
                      groupBy: slo?.groupBy,
                    })) as SloItem[]
                  );
                }
              }}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
        {hasGroupBy && (
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
            id="xpack.slo.Embeddable.config.cancelButtonLabel"
            defaultMessage="Cancel"
          />
        </EuiButtonEmpty>

        <EuiButton
          data-test-subj="sloConfirmButton"
          isDisabled={!selectedSlos || selectedSlos.length === 0 || hasError}
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
