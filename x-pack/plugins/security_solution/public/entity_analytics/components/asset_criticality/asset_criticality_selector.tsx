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
  EuiLoadingSpinner,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiSuperSelect,
  EuiText,
  EuiTitle,
  EuiHorizontalRule,
  useEuiTheme,
} from '@elastic/eui';
import React, { useState } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { css } from '@emotion/react';
import { PICK_ASSET_CRITICALITY } from './translations';
import {
  AssetCriticalityBadge,
  AssetCriticalityBadgeAllowMissing,
} from './asset_criticality_badge';
import type { Entity, ModalState, State } from './use_asset_criticality';
import { useAssetCriticalityData, useCriticalityModal } from './use_asset_criticality';
import type { CriticalityLevel } from '../../../../common/entity_analytics/asset_criticality/types';

interface Props {
  entity: Entity;
}
const AssetCriticalityComponent: React.FC<Props> = ({ entity }) => {
  const modal = useCriticalityModal();
  const criticality = useAssetCriticalityData(entity, modal);
  const { euiTheme } = useEuiTheme();

  if (criticality.privileges.isLoading || !criticality.privileges.data?.has_all_required) {
    return null;
  }

  return (
    <>
      <EuiAccordion
        initialIsOpen
        id="asset-criticality-selector"
        buttonContent={
          <EuiTitle size="xs">
            <h3>
              <FormattedMessage
                id="xpack.securitySolution.entityAnalytics.assetCriticality.accordionTitle"
                defaultMessage="Asset Criticality"
              />
            </h3>
          </EuiTitle>
        }
        buttonProps={{
          css: css`
            color: ${euiTheme.colors.primary};
          `,
        }}
        data-test-subj="asset-criticality-selector"
      >
        {criticality.query.isLoading || criticality.mutation.isLoading ? (
          <EuiLoadingSpinner size="s" />
        ) : (
          <EuiFlexGroup
            direction="row"
            alignItems="center"
            justifyContent="spaceBetween"
            wrap={false}
          >
            <EuiFlexItem>
              <EuiText size="s">
                <AssetCriticalityBadgeAllowMissing
                  criticalityLevel={criticality.query.data?.criticality_level}
                  dataTestSubj="asset-criticality-level"
                />
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem css={{ flexGrow: 'unset' }}>
              <EuiButtonEmpty
                data-test-subj="asset-criticality-change-btn"
                iconType="arrowStart"
                iconSide="left"
                flush="right"
                onClick={() => modal.toggle(true)}
              >
                {criticality.status === 'update' ? (
                  <FormattedMessage
                    id="xpack.securitySolution.entityAnalytics.assetCriticality.changeButton"
                    defaultMessage="Change"
                  />
                ) : (
                  <FormattedMessage
                    id="xpack.securitySolution.entityAnalytics.assetCriticality.createButton"
                    defaultMessage="Create"
                  />
                )}
              </EuiButtonEmpty>
            </EuiFlexItem>
          </EuiFlexGroup>
        )}
      </EuiAccordion>
      <EuiHorizontalRule />
      {modal.visible ? (
        <AssetCriticalityModal entity={entity} criticality={criticality} modal={modal} />
      ) : null}
    </>
  );
};

interface ModalProps {
  criticality: State;
  modal: ModalState;
  entity: Entity;
}
const AssetCriticalityModal: React.FC<ModalProps> = ({ criticality, modal, entity }) => {
  const [value, setNewValue] = useState<CriticalityLevel>(
    criticality.query.data?.criticality_level ?? 'normal'
  );

  return (
    <EuiModal onClose={() => modal.toggle(false)}>
      <EuiModalHeader>
        <EuiModalHeaderTitle data-test-subj="asset-criticality-modal-title">
          {PICK_ASSET_CRITICALITY}
        </EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>
        <EuiSuperSelect
          id={modal.basicSelectId}
          options={options}
          valueOfSelected={value}
          onChange={setNewValue}
          aria-label={PICK_ASSET_CRITICALITY}
          data-test-subj="asset-criticality-modal-select"
        />
      </EuiModalBody>
      <EuiModalFooter>
        <EuiButtonEmpty onClick={() => modal.toggle(false)}>
          <FormattedMessage
            id="xpack.securitySolution.entityAnalytics.assetCriticality.cancelButton"
            defaultMessage="Cancel"
          />
        </EuiButtonEmpty>

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
          <FormattedMessage
            id="xpack.securitySolution.entityAnalytics.assetCriticality.saveButton"
            defaultMessage="Save"
          />
        </EuiButton>
      </EuiModalFooter>
    </EuiModal>
  );
};

const option = (level: CriticalityLevel): EuiSuperSelectOption<CriticalityLevel> => ({
  value: level,
  dropdownDisplay: (
    <AssetCriticalityBadge
      criticalityLevel={level}
      style={{ lineHeight: 'inherit' }}
      dataTestSubj="asset-criticality-modal-select-option"
      withDescription
    />
  ),
  inputDisplay: (
    <AssetCriticalityBadge criticalityLevel={level} style={{ lineHeight: 'inherit' }} />
  ),
});
const options: Array<EuiSuperSelectOption<CriticalityLevel>> = [
  option('normal'),
  option('not_important'),
  option('important'),
  option('very_important'),
];

export const AssetCriticalitySelector = React.memo(AssetCriticalityComponent);
AssetCriticalitySelector.displayName = 'AssetCriticalitySelector';
