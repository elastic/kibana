/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiModal,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiModalBody,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSwitch,
  EuiModalFooter,
  EuiButton,
  EuiHorizontalRule,
  EuiText,
  EuiButtonEmpty,
  EuiBetaBadge,
  EuiToolTip,
} from '@elastic/eui';
import React, { useState } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { TECHNICAL_PREVIEW, TECHNICAL_PREVIEW_TOOLTIP } from '../../../../common/translations';
import {
  ENABLEMENT_DESCRIPTION_RISK_ENGINE_ONLY,
  ENABLEMENT_DESCRIPTION_ENTITY_STORE_ONLY,
} from '../translations';
import { useEntityEnginePrivileges } from '../hooks/use_entity_engine_privileges';
import { MissingPrivilegesCallout } from './missing_privileges_callout';

export interface Enablements {
  riskScore: boolean;
  entityStore: boolean;
}

interface EntityStoreEnablementModalProps {
  visible: boolean;
  toggle: (visible: boolean) => void;
  enableStore: (enablements: Enablements) => () => void;
  riskScore: {
    disabled?: boolean;
    checked?: boolean;
  };
  entityStore: {
    disabled?: boolean;
    checked?: boolean;
  };
}

export const EntityStoreEnablementModal: React.FC<EntityStoreEnablementModalProps> = ({
  visible,
  toggle,
  enableStore,
  riskScore,
  entityStore,
}) => {
  const [enablements, setEnablements] = useState({
    riskScore: !!riskScore.checked,
    entityStore: !!entityStore.checked,
  });
  const { data: privileges, isLoading: isLoadingPrivileges } = useEntityEnginePrivileges();

  if (!visible) {
    return null;
  }
  return (
    <EuiModal onClose={() => toggle(false)}>
      <EuiModalHeader>
        <EuiModalHeaderTitle>
          <FormattedMessage
            id="xpack.securitySolution.entityAnalytics.enablements.modal.title"
            defaultMessage="Additional charges may apply"
          />
        </EuiModalHeaderTitle>
      </EuiModalHeader>

      <EuiModalBody>
        <EuiFlexGroup direction="column">
          <EuiText>
            <FormattedMessage
              id="xpack.securitySolution.entityAnalytics.enablements.modal.description"
              defaultMessage="Please be aware that activating these features may incur additional charges depending on your subscription plan. Review your plan details carefully to avoid unexpected costs before proceeding."
            />
          </EuiText>
          <EuiHorizontalRule margin="none" />
          <EuiFlexItem>
            <EuiSwitch
              label={
                <FormattedMessage
                  id="xpack.securitySolution.entityAnalytics.enablements.modal.risk"
                  defaultMessage="Risk Score"
                />
              }
              checked={enablements.riskScore}
              disabled={riskScore.disabled || false}
              onChange={() => setEnablements((prev) => ({ ...prev, riskScore: !prev.riskScore }))}
            />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiText>{ENABLEMENT_DESCRIPTION_RISK_ENGINE_ONLY}</EuiText>
          </EuiFlexItem>
          <EuiHorizontalRule margin="none" />

          <EuiFlexItem>
            <EuiFlexGroup justifyContent="flexStart">
              <EuiSwitch
                label={
                  <FormattedMessage
                    id="xpack.securitySolution.entityAnalytics.enablements.modal.store"
                    defaultMessage="Entity Store"
                  />
                }
                checked={enablements.entityStore}
                disabled={
                  entityStore.disabled || (!isLoadingPrivileges && !privileges?.has_all_required)
                }
                onChange={() =>
                  setEnablements((prev) => ({ ...prev, entityStore: !prev.entityStore }))
                }
              />
              <EuiToolTip content={TECHNICAL_PREVIEW_TOOLTIP}>
                <EuiBetaBadge label={TECHNICAL_PREVIEW} />
              </EuiToolTip>
            </EuiFlexGroup>
          </EuiFlexItem>
          {!privileges || privileges.has_all_required ? null : (
            <EuiFlexItem>
              <MissingPrivilegesCallout privileges={privileges} />
            </EuiFlexItem>
          )}
          <EuiFlexItem>
            <EuiText>{ENABLEMENT_DESCRIPTION_ENTITY_STORE_ONLY}</EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiModalBody>

      <EuiModalFooter>
        <EuiButtonEmpty onClick={() => toggle(false)}>{'Cancel'}</EuiButtonEmpty>
        <EuiButton onClick={enableStore(enablements)} fill>
          <FormattedMessage
            id="xpack.securitySolution.entityAnalytics.enablements.modal.enable"
            defaultMessage="Enable"
          />
        </EuiButton>
      </EuiModalFooter>
    </EuiModal>
  );
};
