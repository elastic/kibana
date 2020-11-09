/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { memo } from 'react';
import { EuiRadioGroup, EuiRadioGroupOption } from '@elastic/eui';
import styled from 'styled-components';

const OptionsWrapper = styled.div`
  ${({ theme }) => `
  & > div {
    display: flex;
    align-items: center;
  }

  & .euiRadio {
    margin-top: 0;
    margin-right: ${theme.eui.euiSize};
  }
  `}
`;

interface CaseOptionsProps {
  options: EuiRadioGroupOption[];
  selectedOption: string;
  onOptionChanged: (option: string) => void;
}

const CaseOptionsComponent: React.FC<CaseOptionsProps> = ({
  onOptionChanged,
  selectedOption,
  options,
}) => {
  return (
    <>
      <OptionsWrapper>
        <EuiRadioGroup options={options} idSelected={selectedOption} onChange={onOptionChanged} />
      </OptionsWrapper>
    </>
  );
};

export const CaseOptions = memo(CaseOptionsComponent);
