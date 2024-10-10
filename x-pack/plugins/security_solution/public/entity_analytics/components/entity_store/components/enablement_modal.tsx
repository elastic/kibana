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
} from '@elastic/eui';
import React, { useState } from 'react';

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
}

export const EntityStoreEnablementModal: React.FC<EntityStoreEnablementModalProps> = ({
  visible,
  toggle,
  enableStore,
  riskScore,
}) => {
  const [enablements, setEnablements] = useState({
    riskScore: !!riskScore.checked,
    entityStore: true,
  });

  if (!visible) {
    return null;
  }
  return (
    <EuiModal onClose={() => toggle(false)}>
      <EuiModalHeader>
        <EuiModalHeaderTitle>{'Enable Store'}</EuiModalHeaderTitle>
      </EuiModalHeader>

      <EuiModalBody>
        <EuiFlexGroup>
          <EuiFlexItem>
            <EuiSwitch
              label="Risk Score"
              checked={!!riskScore.checked}
              disabled={riskScore.disabled || false}
              onChange={() => setEnablements((prev) => ({ ...prev, riskScore: !prev.riskScore }))}
            />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiSwitch
              label="Entity Store"
              checked
              onChange={() =>
                setEnablements((prev) => ({ ...prev, entityStore: !prev.entityStore }))
              }
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiModalBody>

      <EuiModalFooter>
        <EuiButton onClick={enableStore(enablements)} fill>
          {'Go'}
        </EuiButton>
      </EuiModalFooter>
    </EuiModal>
  );
};
