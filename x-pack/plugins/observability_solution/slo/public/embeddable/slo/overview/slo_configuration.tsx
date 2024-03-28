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
import type { EmbeddableSloProps, SloEmbeddableInput, GroupFilters } from './types';
import { SloGroupConfiguration } from './slo_group_configuration';
import { OverviewModeSelector } from './overview_mode_selector';

interface SloConfigurationProps {
  initialInput?: Partial<SloEmbeddableInput>;
  onCreate: (props: EmbeddableSloProps) => void;
  onCancel: () => void;
}
export type SLOView = 'cardView' | 'listView';

export function SloConfiguration({ initialInput, onCreate, onCancel }: SloConfigurationProps) {
  const [overviewMode, setOverviewMode] = useState<string>(initialInput?.overviewMode ?? 'single');
  const [selectedGroupFilters, setSelectedGroupFilters] = useState<GroupFilters>({
    groupBy: 'tags',
    groups: [],
    sloView: 'cardView',
  });
  const [selectedSlo, setSelectedSlo] = useState<EmbeddableSloProps>();
  const [showAllGroupByInstances, setShowAllGroupByInstances] = useState(false);
  const onConfirmClick = () =>
    onCreate({
      showAllGroupByInstances,
      sloId: selectedSlo?.sloId,
      sloInstanceId: selectedSlo?.sloInstanceId,
      overviewMode,
      groupFilters: selectedGroupFilters,
    });
  const [hasError, setHasError] = useState(false);
  const hasGroupBy = selectedSlo && selectedSlo.sloInstanceId !== ALL_VALUE;

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
          <EuiFlexItem>
            <OverviewModeSelector value={overviewMode} onChange={(mode) => setOverviewMode(mode)} />
            <EuiSpacer size="m" />
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiFlexGroup>
          <EuiFlexItem>
            {overviewMode === 'groups' ? (
              <SloGroupConfiguration
                onSelected={(prop, value) => {
                  setSelectedGroupFilters((prevState) => ({ ...prevState, [prop]: value }));
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
        {overviewMode === 'single' && hasGroupBy && (
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
