/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiSuperSelectOption } from '@elastic/eui';
import {
  EuiAccordion,
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHealth,
  EuiLoadingSpinner,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiSuperSelect,
  EuiText,
  useGeneratedHtmlId,
} from '@elastic/eui';

import type { UseMutationResult, UseQueryResult } from '@tanstack/react-query';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import React, { useState } from 'react';
import { useToggle } from 'react-use';
import {
  ASSET_CRITICALITY_OPTION_TEXT,
  CREATE_ASSET_CRITICALITY,
  CRITICALITY_LEVEL_COLOR,
  PICK_ASSET_CRITICALITY,
} from '../../../common/asset_criticality';
import type { EntityAnalyticsPrivileges } from '../../../common/api/entity_analytics/common';
import type { AssetCriticalityRecord } from '../../../common/api/entity_analytics/asset_criticality';

import {
  createAssetCriticality,
  fetchAssetCriticality,
  fetchAssetCriticalityPrivileges,
} from '../api/api';

interface Props {
  entity: Entity;
}
export const AssetCriticalitySelector: React.FC<Props> = ({ entity }) => {
  const criticality = useAssetCriticality(entity);

  if (criticality.privileges.isLoading || !criticality.privileges.data?.has_all_required) {
    return null;
  }

  return (
    <>
      <EuiAccordion
        id="asset-criticality-selector"
        buttonContent="Asset Criticality"
        data-test-subj="asset-criticality-selector"
      >
        {criticality.query.isLoading || criticality.mutation.isLoading ? (
          <EuiLoadingSpinner size="s" />
        ) : (
          <EuiFlexGroup direction="row" alignItems="center" wrap={false}>
            <EuiFlexItem>
              <EuiText size="s">
                {criticality.status === 'update' && criticality.query.data?.criticality_level ? (
                  <EuiHealth
                    color={CRITICALITY_LEVEL_COLOR[criticality.query.data.criticality_level]}
                  >
                    {criticalityDisplayText[criticality.query.data.criticality_level]}
                  </EuiHealth>
                ) : (
                  <EuiHealth color="subdued">{CREATE_ASSET_CRITICALITY}</EuiHealth>
                )}
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiButtonEmpty
                data-test-subj="asset-criticality-change-btn"
                iconType="arrowStart"
                iconSide="left"
                flush="right"
                onClick={criticality.modal.toggle(true)}
              >
                {criticality.status === 'update' ? 'Change' : 'Create'}
              </EuiButtonEmpty>
            </EuiFlexItem>
          </EuiFlexGroup>
        )}
      </EuiAccordion>
      {criticality.modal.visible ? (
        <AssetCriticalityModal entity={entity} criticality={criticality} />
      ) : null}
    </>
  );
};

interface ModalProps {
  criticality: State;
  entity: Entity;
}
const AssetCriticalityModal: React.FC<ModalProps> = ({ criticality, entity }) => {
  const basicSelectId = useGeneratedHtmlId({ prefix: 'basicSelect' });
  const [value, setNewValue] = useState<AssetCriticalityRecord['criticality_level']>(
    criticality.query.data?.criticality_level ?? 'normal'
  );

  return (
    <EuiModal onClose={criticality.modal.toggle(false)}>
      <EuiModalHeader>
        <EuiModalHeaderTitle data-test-subj="asset-criticality-modal-title">
          {PICK_ASSET_CRITICALITY}
        </EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>
        <EuiSuperSelect
          id={basicSelectId}
          options={options}
          valueOfSelected={value}
          onChange={setNewValue}
          aria-label={PICK_ASSET_CRITICALITY}
          data-test-subj="asset-criticality-modal-select-dropdown"
        />
      </EuiModalBody>
      <EuiModalFooter>
        <EuiButtonEmpty onClick={criticality.modal.toggle(false)}>{'Cancel'}</EuiButtonEmpty>

        <EuiButton
          onClick={() =>
            criticality.mutation.mutate({
              criticalityLevel: value,
              idField: `${entity.type}.name`,
              idValue: entity.name,
            })
          }
          fill
          data-test-subj="asset-criticality-modal-save-btn"
        >
          {'Save'}
        </EuiButton>
      </EuiModalFooter>
    </EuiModal>
  );
};

const useAssetCriticality = (entity: Entity): State => {
  const [visible, toggleModal] = useToggle(false);
  const modal = { visible, toggle: (next: boolean) => () => toggleModal(next) };

  const QC = useQueryClient();

  const privileges = useQuery({
    queryKey: ['ASSET_CRITICALITY', 'PRIVILEGES', entity.name],
    queryFn: fetchAssetCriticalityPrivileges,
  });
  const query = useQuery<AssetCriticalityRecord, { body: { statusCode: number } }>({
    queryKey: ['ASSET_CRITICALITY', entity.name],
    queryFn: () => fetchAssetCriticality({ idField: `${entity.type}.name`, idValue: entity.name }),
    retry: (failureCount, error) => error.body.statusCode === 404 && failureCount > 0,
    enabled: privileges.data?.has_all_required,
  });

  const mutation = useMutation({
    mutationFn: createAssetCriticality,
    onSuccess: (data) => {
      QC.setQueryData(['ASSET_CRITICALITY', entity.name], data);
      toggleModal(false);
    },
  });

  return {
    status: query.isError && query.error.body.statusCode === 404 ? 'create' : 'update',
    query,
    mutation,
    modal,
    privileges,
  };
};

interface State {
  status: 'create' | 'update';
  query: UseQueryResult<AssetCriticalityRecord>;
  privileges: UseQueryResult<EntityAnalyticsPrivileges>;
  mutation: UseMutationResult<AssetCriticalityRecord, unknown, Params, unknown>;
  modal: ModalState;
}
type Params = Parameters<typeof createAssetCriticality>[0];

interface ModalState {
  visible: boolean;
  toggle: (next: boolean) => () => void;
}

interface Entity {
  name: string;
  type: 'host' | 'user';
}

const criticalityDisplayText: Record<AssetCriticalityRecord['criticality_level'], string> = {
  normal: 'Normal',
  not_important: 'Not important',
  important: 'Important',
  very_important: 'Very important',
};

const option = (
  level: AssetCriticalityRecord['criticality_level']
): EuiSuperSelectOption<AssetCriticalityRecord['criticality_level']> => ({
  value: level,
  dropdownDisplay: (
    <EuiHealth color={CRITICALITY_LEVEL_COLOR[level]} style={{ lineHeight: 'inherit' }}>
      <strong>{criticalityDisplayText[level]}</strong>
      <EuiText size="s" color="subdued">
        <p>{ASSET_CRITICALITY_OPTION_TEXT[level]}</p>
      </EuiText>
    </EuiHealth>
  ),
  inputDisplay: (
    <EuiHealth color={CRITICALITY_LEVEL_COLOR[level]} style={{ lineHeight: 'inherit' }}>
      {criticalityDisplayText[level]}
    </EuiHealth>
  ),
});
const options: Array<EuiSuperSelectOption<AssetCriticalityRecord['criticality_level']>> = [
  option('normal'),
  option('not_important'),
  option('important'),
  option('very_important'),
];
