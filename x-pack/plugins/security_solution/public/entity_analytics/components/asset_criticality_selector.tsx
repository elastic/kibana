/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiAccordion,
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiSelect,
  EuiText,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import type { UseMutationResult, UseQueryResult } from '@tanstack/react-query';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import React, { useState } from 'react';
import { useToggle } from 'react-use';
import type { AssetCriticalityRecord } from '../../../common/api/entity_analytics/asset_criticality';

import { createAssetCriticality, fetchAssetCriticality } from '../api/api';

interface Props {
  entity: Entity;
}
export const AssetCriticalitySelector: React.FC<Props> = ({ entity }) => {
  const criticality = useAssetCriticality(entity);

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
                <p>
                  {criticality.status === 'update' && criticality.query.data?.criticality_level
                    ? criticalityDisplayText[criticality.query.data.criticality_level]
                    : CREATE_ASSET_CRITICALITY}
                </p>
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
        <EuiSelect
          id={basicSelectId}
          options={options}
          value={value}
          onChange={(e) =>
            setNewValue(e.target.value as AssetCriticalityRecord['criticality_level'])
          }
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

  const query = useQuery<AssetCriticalityRecord, { body: { statusCode: number } }>({
    queryKey: ['ASSET_CRITICALITY', entity.name],
    queryFn: () => fetchAssetCriticality({ idField: `${entity.type}.name`, idValue: entity.name }),
    retry: (failureCount, error) => error.body.statusCode === 404 && failureCount > 0,
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
  };
};

interface State {
  status: 'create' | 'update';
  query: UseQueryResult<AssetCriticalityRecord>;
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
interface KeyVal {
  value: AssetCriticalityRecord['criticality_level'];
  text: string;
}
const options: KeyVal[] = [
  { value: 'normal', text: criticalityDisplayText.normal },
  { value: 'not_important', text: criticalityDisplayText.not_important },
  { value: 'important', text: criticalityDisplayText.important },
  { value: 'very_important', text: criticalityDisplayText.very_important },
];

const PICK_ASSET_CRITICALITY = i18n.translate(
  'xpack.securitySolution.timeline.sidePanel.hostDetails.assetCriticality.pick',
  {
    defaultMessage: 'Pick asset criticality level',
  }
);

const CREATE_ASSET_CRITICALITY = i18n.translate(
  'xpack.securitySolution.timeline.sidePanel.hostDetails.assetCriticality.create',
  {
    defaultMessage: 'No criticality assigned yet',
  }
);
