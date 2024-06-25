/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiSuperSelectOption } from '@elastic/eui';

import {
  EuiToolTip,
  EuiIcon,
  EuiSpacer,
  useEuiFontSize,
  EuiButtonIcon,
  useGeneratedHtmlId,
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
  EuiTitle,
  EuiHorizontalRule,
  useEuiTheme,
} from '@elastic/eui';
import React, { useState } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { css } from '@emotion/css';
import { i18n } from '@kbn/i18n';
import { useToggle } from 'react-use';
import { PICK_ASSET_CRITICALITY } from './translations';
import { AssetCriticalityBadge } from './asset_criticality_badge';
import type { Entity, State } from './use_asset_criticality';
import { useAssetCriticalityData, useAssetCriticalityPrivileges } from './use_asset_criticality';
import type {
  CriticalityLevel,
  CriticalityLevelWithUnassigned,
} from '../../../../common/entity_analytics/asset_criticality/types';

interface Props {
  entity: Entity;
  onChange?: () => void;
}
const AssetCriticalitySelectorComponent: React.FC<{
  criticality: State;
  entity: Entity;
  compressed?: boolean;
}> = ({ criticality, entity, compressed = false }) => {
  const [visible, toggleModal] = useToggle(false);
  const sFontSize = useEuiFontSize('s').fontSize;

  const onSave = (value: CriticalityLevelWithUnassigned) => {
    criticality.mutation.mutate({
      criticalityLevel: value,
      idField: `${entity.type}.name`,
      idValue: entity.name,
    });
    toggleModal(false);
  };

  return (
    <>
      {criticality.query.isLoading || criticality.mutation.isLoading ? (
        <>
          <EuiSpacer size="s" />
          <EuiLoadingSpinner size="s" data-test-subj="asset-criticality-selector-loading" />
        </>
      ) : (
        <EuiFlexGroup
          direction="row"
          alignItems="center"
          justifyContent="spaceBetween"
          data-test-subj="asset-criticality-selector"
          wrap={false}
          gutterSize={'xs'}
          responsive={false}
        >
          <EuiFlexItem grow={false}>
            <AssetCriticalityBadge
              criticalityLevel={criticality.query.data?.criticality_level}
              dataTestSubj="asset-criticality-level"
              className={css`
                font-size: ${sFontSize};
              `}
            />
          </EuiFlexItem>
          {compressed && criticality.privileges.data?.has_write_permissions && (
            <EuiFlexItem>
              <EuiButtonIcon
                data-test-subj="asset-criticality-change-btn"
                iconSize="s"
                iconType={'pencil'}
                aria-label={i18n.translate(
                  'xpack.securitySolution.entityAnalytics.assetCriticality.compressedButtonArialLabel',
                  {
                    defaultMessage: 'Change asset criticality',
                  }
                )}
                onClick={() => toggleModal(true)}
              />
            </EuiFlexItem>
          )}

          {!compressed && criticality.privileges.data?.has_write_permissions && (
            <EuiFlexItem css={{ flexGrow: 'unset' }}>
              <EuiButtonEmpty
                data-test-subj="asset-criticality-change-btn"
                iconType="arrowStart"
                iconSide="left"
                flush="right"
                onClick={() => toggleModal(true)}
              >
                {criticality.status === 'update' ? (
                  <FormattedMessage
                    id="xpack.securitySolution.entityAnalytics.assetCriticality.changeButton"
                    defaultMessage="Change"
                  />
                ) : (
                  <FormattedMessage
                    id="xpack.securitySolution.entityAnalytics.assetCriticality.createButton"
                    defaultMessage="Assign"
                  />
                )}
              </EuiButtonEmpty>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      )}
      {visible ? (
        <AssetCriticalityModal
          onSave={onSave}
          initialCriticalityLevel={criticality.query.data?.criticality_level}
          toggle={toggleModal}
        />
      ) : null}
    </>
  );
};

export const AssetCriticalitySelector = React.memo(AssetCriticalitySelectorComponent);
AssetCriticalitySelector.displayName = 'AssetCriticalitySelector';

const AssetCriticalityAccordionComponent: React.FC<Props> = ({ entity, onChange }) => {
  const { euiTheme } = useEuiTheme();
  const privileges = useAssetCriticalityPrivileges(entity.name);
  const criticality = useAssetCriticalityData({
    entity,
    enabled: !!privileges.data?.has_read_permissions,
    onChange,
  });

  if (privileges.isLoading || !privileges.data?.has_read_permissions) {
    return null;
  }

  return (
    <>
      <EuiAccordion
        initialIsOpen
        id="asset-criticality-selector"
        buttonContent={<AssetCriticalityTitle />}
        buttonProps={{
          css: css`
            color: ${euiTheme.colors.primary};
          `,
        }}
        data-test-subj="asset-criticality-selector"
      >
        <AssetCriticalitySelector criticality={criticality} entity={entity} />
      </EuiAccordion>
      <EuiHorizontalRule />
    </>
  );
};

export const AssetCriticalityTitle = () => (
  <EuiToolTip
    position="top"
    content={
      <FormattedMessage
        id="xpack.securitySolution.entityAnalytics.assetCriticality.accordionTooltip"
        defaultMessage="You can now categorize entities based on your organization's sensitivity and business risk. The classification tiers can be used to prioritize alert triage and investigation tasks. If the entity risk engine is enabled, the asset classification tier will dynamically impact the entity risk."
      />
    }
  >
    <EuiFlexGroup gutterSize="xs" alignItems="center">
      <EuiFlexItem grow={false}>
        <EuiTitle size="xs">
          <h3>
            <FormattedMessage
              id="xpack.securitySolution.entityAnalytics.assetCriticality.accordionTitle"
              defaultMessage="Asset Criticality"
            />
          </h3>
        </EuiTitle>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiIcon type="iInCircle" color="subdued" />
      </EuiFlexItem>
    </EuiFlexGroup>
  </EuiToolTip>
);

interface ModalProps {
  initialCriticalityLevel: CriticalityLevel | undefined;
  toggle: (nextValue: boolean) => void;
  onSave: (value: CriticalityLevelWithUnassigned) => void;
}

const AssetCriticalityModal: React.FC<ModalProps> = ({
  initialCriticalityLevel,
  toggle,
  onSave,
}) => {
  const basicSelectId = useGeneratedHtmlId({ prefix: 'basicSelect' });
  const [value, setNewValue] = useState<CriticalityLevelWithUnassigned>(
    initialCriticalityLevel ?? 'unassigned'
  );

  return (
    <EuiModal onClose={() => toggle(false)}>
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
          data-test-subj="asset-criticality-modal-select"
        />
      </EuiModalBody>
      <EuiModalFooter>
        <EuiButtonEmpty onClick={() => toggle(false)}>
          <FormattedMessage
            id="xpack.securitySolution.entityAnalytics.assetCriticality.cancelButton"
            defaultMessage="Cancel"
          />
        </EuiButtonEmpty>

        <EuiButton
          onClick={() => onSave(value)}
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

const option = (
  level: CriticalityLevelWithUnassigned
): EuiSuperSelectOption<CriticalityLevelWithUnassigned> => ({
  value: level,
  dropdownDisplay: (
    <AssetCriticalityBadge
      criticalityLevel={level}
      style={{ lineHeight: 'inherit' }}
      dataTestSubj="asset-criticality-modal-select-option"
    />
  ),
  inputDisplay: (
    <AssetCriticalityBadge criticalityLevel={level} style={{ lineHeight: 'inherit' }} />
  ),
});
const options: Array<EuiSuperSelectOption<CriticalityLevelWithUnassigned>> = [
  option('unassigned'),
  option('low_impact'),
  option('medium_impact'),
  option('high_impact'),
  option('extreme_impact'),
];

export const AssetCriticalityAccordion = React.memo(AssetCriticalityAccordionComponent);
AssetCriticalityAccordion.displayName = 'AssetCriticalityAccordion';
