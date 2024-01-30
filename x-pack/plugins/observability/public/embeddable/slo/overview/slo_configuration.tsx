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
  EuiFormRow,
  EuiSpacer,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { SloSelector } from '../alerts/slo_selector';
import type { EmbeddableSloProps, SloEmbeddableInput } from './types';
import { SloGroupConfiguration } from './slo_group_configuration';
import { OverviewModeSelector } from './overview_mode_selector';

interface SloConfigurationProps {
  initialInput?: Partial<SloEmbeddableInput>;
  onCreate: (props: EmbeddableSloProps) => void;
  onCancel: () => void;
}

export function SloConfiguration({ initialInput, onCreate, onCancel }: SloConfigurationProps) {
  const [selectedSlo, setSelectedSlo] = useState<EmbeddableSloProps>();
  const [overviewMode, setOverviewMode] = useState(initialInput?.overviewMode ?? 'single');
  const [selectedGroups, setSelectedGroups] = useState();
  const [selectedGroupBy, setSelectedGroupBy] = useState();
  const [selectedSloView, setSelectedSloView] = useState();

  // TODO  create a separate onCreate function for single vs group SLOs sending the appropriate params
  const onConfirmClick = () =>
    onCreate({
      sloId: selectedSlo?.sloId,
      sloInstanceId: selectedSlo?.sloInstanceId,
      overviewMode,
      groups: selectedGroups,
      groupBy: selectedGroupBy,
      sloView: selectedSloView,
    });
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
          <EuiFlexItem>
            <OverviewModeSelector value={overviewMode} onChange={setOverviewMode} />
            <EuiSpacer size="m" />
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiFlexGroup>
          <EuiFlexItem>
            {overviewMode === 'groups' ? (
              <SloGroupConfiguration
                onSelected={({ sloView, groupBy, groups }) => {
                  console.log(groupBy, '!!groupBy');
                  setSelectedGroupBy(groupBy);
                  setSelectedGroups(groups);
                  setSelectedSloView(sloView);
                }}
              />
            ) : (
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
            )}
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

        <EuiButton data-test-subj="sloConfirmButton" onClick={onConfirmClick} fill>
          <FormattedMessage
            id="xpack.observability.embeddableSlo.config.confirmButtonLabel"
            defaultMessage="Confirm configurations"
          />
        </EuiButton>
      </EuiModalFooter>
    </EuiModal>
  );
}
