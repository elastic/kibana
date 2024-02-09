/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiSuperSelectOption } from '@elastic/eui';

import {
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
import {
  AssetCriticalityBadge,
  AssetCriticalityBadgeAllowMissing,
} from './asset_criticality_badge';
import type { Entity, State } from './use_asset_criticality';
import { useAssetCriticalityData, useAssetCriticalityPrivileges } from './use_asset_criticality';
import type { CriticalityLevel } from '../../../../common/entity_analytics/asset_criticality/types';

interface Props {
  entity: Entity;
}
const AssetCriticalitySelectorComponent: React.FC<{
  criticality: State;
  entity: Entity;
  compressed?: boolean;
}> = ({ criticality, entity, compressed = false }) => {
  const [visible, toggleModal] = useToggle(false);
  const sFontSize = useEuiFontSize('s').fontSize;

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
            <AssetCriticalityBadgeAllowMissing
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
        <AssetCriticalityModal entity={entity} criticality={criticality} toggle={toggleModal} />
      ) : null}
    </>
  );
};

export const AssetCriticalitySelector = React.memo(AssetCriticalitySelectorComponent);
AssetCriticalitySelector.displayName = 'AssetCriticalitySelector';

const AssetCriticalityAccordionComponent: React.FC<Props> = ({ entity }) => {
  const { euiTheme } = useEuiTheme();
  const privileges = useAssetCriticalityPrivileges(entity.name);
  const criticality = useAssetCriticalityData({
    entity,
    enabled: !!privileges.data?.has_read_permissions,
  });

  if (privileges.isLoading || !privileges.data?.has_read_permissions) {
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
        <AssetCriticalitySelector criticality={criticality} entity={entity} />
      </EuiAccordion>
      <EuiHorizontalRule />
    </>
  );
};

interface ModalProps {
  criticality: State;
  toggle: (nextValue: boolean) => void;
  entity: Entity;
}

const AssetCriticalityModal: React.FC<ModalProps> = ({ criticality, entity, toggle }) => {
  const basicSelectId = useGeneratedHtmlId({ prefix: 'basicSelect' });
  const [value, setNewValue] = useState<CriticalityLevel>(
    criticality.query.data?.criticality_level ?? 'normal'
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
          onClick={() => {
            criticality.mutation.mutate({
              criticalityLevel: value,
              idField: `${entity.type}.name`,
              idValue: entity.name,
            });
            toggle(false);
          }}
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

export const AssetCriticalityAccordion = React.memo(AssetCriticalityAccordionComponent);
AssetCriticalityAccordion.displayName = 'AssetCriticalityAccordion';
