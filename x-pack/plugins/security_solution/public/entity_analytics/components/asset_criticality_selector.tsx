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
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiSelect,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { MouseEventHandler } from 'react';
import React, { useState } from 'react';
import { useToggle } from 'react-use';

import { RiskSeverity } from '../../../common/search_strategy';
import { RiskScoreLevel } from '../../explore/components/risk_score/severity/common';

export const AssetCriticalitySelector = () => {
  const criticality = useAssetCriticality();
  const { modal, state, setState } = criticality;

  const cancel: MouseEventHandler<HTMLButtonElement> = (e) => {
    setState({ value: options[1].value, dirty: false });
  };

  return (
    <>
      <EuiAccordion
        id="asset-criticality-selector"
        buttonContent="Asset Criticality"
        data-test-subj="asset-criticality-selector"
      >
        <EuiFlexGroup direction="row" alignItems="center" wrap={false}>
          <EuiFlexItem>
            <RiskScoreLevel severity={state.value} data-test-subj="asset-criticality-level" />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiButtonEmpty
              data-test-subj="asset-criticality-change-btn"
              iconType={state.dirty ? 'arrowEnd' : 'arrowStart'}
              iconSide="left"
              flush="right"
              onClick={state.dirty ? cancel : modal.toggle(true)}
            >
              {state.dirty ? 'Cancel Changes' : 'Change'}
            </EuiButtonEmpty>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiAccordion>
      {modal.visible ? <AssetCriticalityModal {...criticality} /> : null}
    </>
  );
};

const AssetCriticalityModal: React.FC<AssetCriticality> = ({ modal, state, setState }) => {
  const basicSelectId = useGeneratedHtmlId({ prefix: 'basicSelect' });

  return (
    <EuiModal onClose={modal.toggle(false)}>
      <EuiModalHeader>
        <EuiModalHeaderTitle data-test-subj="asset-criticality-modal-title">
          {i18n.translate('xpack.securitySolution.timeline.sidePanel.assetCriticality', {
            defaultMessage: 'Pick asset criticality level',
          })}
        </EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>
        <EuiSelect
          id={basicSelectId}
          options={options}
          value={state.value}
          onChange={(e) => setState({ value: e.target.value as RiskSeverity, dirty: true })}
          aria-label={i18n.translate(
            'xpack.securitySolution.timeline.sidePanel.hostDetails.assetCriticality',
            {
              defaultMessage: 'Pick asset criticality level',
            }
          )}
          data-test-subj="asset-criticality-modal-select-dropdown"
        />
      </EuiModalBody>
      <EuiModalFooter>
        <EuiButtonEmpty onClick={modal.toggle(false)}>{'Cancel'}</EuiButtonEmpty>

        <EuiButton
          onClick={modal.toggle(false)}
          fill
          data-test-subj="asset-criticality-modal-save-btn"
        >
          {'Save'}
        </EuiButton>
      </EuiModalFooter>
    </EuiModal>
  );
};

const useAssetCriticality = (): AssetCriticality => {
  const [visible, toggleModal] = useToggle(false);
  const [state, setState] = useState<State>({ value: options[1].value, dirty: false });

  return {
    // returning a thunk so we can directly pass it to event handlers
    modal: { visible, toggle: (next: boolean) => () => toggleModal(next) },
    state,
    setState,
  };
};

interface State {
  value: RiskSeverity;
  dirty: boolean;
}

interface ModalState {
  visible: boolean;
  toggle: (next: boolean) => () => void;
}

interface AssetCriticality {
  modal: ModalState;
  state: State;
  setState: (action: React.SetStateAction<State>) => void;
}

const options = [
  { value: RiskSeverity.unknown, text: 'Unknown' },
  { value: RiskSeverity.low, text: 'Low' },
  { value: RiskSeverity.moderate, text: 'Moderate' },
  { value: RiskSeverity.high, text: 'High' },
  { value: RiskSeverity.critical, text: 'Critical' },
];
