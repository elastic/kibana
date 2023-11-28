/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiAccordion,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiModal,
  EuiModalBody,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiSelect,
  useGeneratedHtmlId,
} from '@elastic/eui';
import type { ChangeEventHandler } from 'react';
import React, { useState } from 'react';

import { RiskSeverity } from '../../../common/search_strategy';
import { RiskScoreLevel } from '../../explore/components/risk_score/severity/common';

export const AssetCriticalitySelector = () => {
  const [isModalVisible, setIsModalVisible] = useState(false);

  const closeModal = () => setIsModalVisible(false);
  const showModal = () => setIsModalVisible(true);

  const options = [
    { value: RiskSeverity.low, text: 'Low' },
    { value: RiskSeverity.moderate, text: 'Moderate' },
    { value: RiskSeverity.high, text: 'High' },
    { value: RiskSeverity.critical, text: 'Critical' },
  ];

  const [value, setValue] = useState<RiskSeverity>(options[1].value);

  const basicSelectId = useGeneratedHtmlId({ prefix: 'basicSelect' });

  const onChange: ChangeEventHandler<HTMLSelectElement> = (e) => {
    setValue(e.target.value as RiskSeverity);
  };

  const modal = !isModalVisible ? null : (
    <EuiModal onClose={closeModal}>
      <EuiModalHeader>
        <EuiModalHeaderTitle>{'Change asset criticality'}</EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>
        <EuiSelect
          id={basicSelectId}
          options={options}
          value={value}
          onChange={onChange}
          aria-label="Use aria labels when no actual label is in use"
        />
      </EuiModalBody>
    </EuiModal>
  );

  return (
    <>
      <EuiAccordion id="asset-criticality-selector" buttonContent="Asset Criticality">
        <EuiFlexGroup>
          <EuiFlexItem>
            <RiskScoreLevel severity={value} />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiButtonEmpty flush="right" onClick={showModal}>
              {'Change'}
            </EuiButtonEmpty>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiAccordion>
      {modal}
    </>
  );
};
