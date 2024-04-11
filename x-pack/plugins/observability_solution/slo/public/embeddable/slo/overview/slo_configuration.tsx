/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import './slo_configuration.scss';

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

import type {
  SingleSloProps,
  GroupSloProps,
  SloEmbeddableInput,
  GroupFilters,
  OverviewMode,
} from './types';
import { SloGroupFilters } from './slo_group_filters';
import { OverviewModeSelector } from './overview_mode_selector';

interface SloConfigurationProps {
  initialInput?: Partial<SloEmbeddableInput> | undefined;
  onCreate: (props: SingleSloProps | GroupSloProps) => void;
  onCancel: () => void;
}

interface SingleConfigurationProps {
  onCreate: (props: SingleSloProps) => void;
  onCancel: () => void;
  overviewMode: OverviewMode;
}

interface GroupConfigurationProps {
  onCreate: (props: GroupSloProps) => void;
  onCancel: () => void;
  overviewMode: OverviewMode;
  initialInput?: GroupSloProps;
}

function SingleSloConfiguration({ overviewMode, onCreate, onCancel }: SingleConfigurationProps) {
  const [selectedSlo, setSelectedSlo] = useState<SingleSloProps>();
  const [showAllGroupByInstances, setShowAllGroupByInstances] = useState(false);
  const [hasError, setHasError] = useState(false);
  const hasGroupBy = selectedSlo && selectedSlo.sloInstanceId !== ALL_VALUE;

  const onConfirmClick = () =>
    onCreate({
      showAllGroupByInstances,
      sloId: selectedSlo?.sloId,
      sloInstanceId: selectedSlo?.sloInstanceId,
      overviewMode,
    });

  return (
    <>
      <EuiModalBody>
        <EuiFlexGroup>
          <EuiFlexItem>
            <EuiFlexGroup>
              <EuiFlexItem>
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
            {hasGroupBy && (
              <>
                <EuiSpacer />
                <EuiSwitch
                  label={i18n.translate(
                    'xpack.slo.sloConfiguration.euiSwitch.showAllGroupByLabel',
                    {
                      defaultMessage: 'Show all related group-by instances',
                    }
                  )}
                  checked={showAllGroupByInstances}
                  onChange={(e) => {
                    setShowAllGroupByInstances(e.target.checked);
                  }}
                />
              </>
            )}
          </EuiFlexItem>
        </EuiFlexGroup>
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
            id="xpack.slo.overviewEmbeddableSlo.config.confirmButtonLabel"
            defaultMessage="Save"
          />
        </EuiButton>
      </EuiModalFooter>
    </>
  );
}

function GroupSloConfiguration({
  overviewMode,
  onCreate,
  onCancel,
  initialInput,
}: GroupConfigurationProps) {
  const [selectedGroupFilters, setSelectedGroupFilters] = useState<GroupFilters>({
    groupBy: initialInput?.groupFilters.groupBy ?? 'status',
    filters: initialInput?.groupFilters.filters ?? [],
    kqlQuery: initialInput?.groupFilters.kqlQuery ?? '',
    groups: initialInput?.groupFilters.groups ?? [],
  });

  const onConfirmClick = () =>
    onCreate({
      groupFilters: selectedGroupFilters,
      overviewMode,
    });

  return (
    <>
      <EuiModalBody className="sloOverviewEmbeddable">
        <EuiFlexGroup>
          <EuiFlexItem>
            <EuiFlexGroup>
              <EuiFlexItem>
                <SloGroupFilters
                  selectedFilters={selectedGroupFilters}
                  onSelected={(prop, value) => {
                    setSelectedGroupFilters((prevState) => ({ ...prevState, [prop]: value }));
                  }}
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiModalBody>
      <EuiModalFooter>
        <EuiButtonEmpty onClick={onCancel} data-test-subj="sloCancelButton">
          <FormattedMessage
            id="xpack.slo.sloEmbeddable.config.cancelButtonLabel"
            defaultMessage="Cancel"
          />
        </EuiButtonEmpty>

        <EuiButton data-test-subj="sloConfirmButton" onClick={onConfirmClick} fill>
          <FormattedMessage
            id="xpack.slo.overviewEmbeddableSlo.config.confirmButtonLabel"
            defaultMessage="Save"
          />
        </EuiButton>
      </EuiModalFooter>
    </>
  );
}

export function SloConfiguration({ initialInput, onCreate, onCancel }: SloConfigurationProps) {
  const [overviewMode, setOverviewMode] = useState<OverviewMode>(
    initialInput?.overviewMode ?? 'single'
  );

  return (
    <EuiModal onClose={onCancel} style={{ minWidth: 550 }}>
      <EuiModalHeader css={{ paddingBottom: 0 }}>
        <EuiFlexGroup direction="column">
          <EuiFlexItem>
            <EuiModalHeaderTitle>
              {i18n.translate('xpack.slo.sloEmbeddable.config.sloSelector.headerTitle', {
                defaultMessage: 'SLO configuration',
              })}
            </EuiModalHeaderTitle>
          </EuiFlexItem>
          {initialInput?.overviewMode === undefined && (
            <EuiFlexItem>
              <OverviewModeSelector
                value={overviewMode}
                onChange={(mode) => setOverviewMode(mode)}
              />
              <EuiSpacer size="m" />
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      </EuiModalHeader>
      {overviewMode === 'groups' ? (
        <GroupSloConfiguration
          initialInput={initialInput as GroupSloProps}
          overviewMode={overviewMode}
          onCreate={onCreate}
          onCancel={onCancel}
        />
      ) : (
        <SingleSloConfiguration
          overviewMode={overviewMode}
          onCreate={onCreate}
          onCancel={onCancel}
        />
      )}
    </EuiModal>
  );
}
