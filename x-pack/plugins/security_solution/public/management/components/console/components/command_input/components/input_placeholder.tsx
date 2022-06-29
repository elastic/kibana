/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import styled from 'styled-components';
import { EuiText, EuiTextColor } from '@elastic/eui';
import { useTestIdGenerator } from '../../../../../hooks/use_test_id_generator';
import { useWithInputTextEntered } from '../../../hooks/state_selectors/use_with_input_text_entered';
import { useWithInputPlaceholder } from '../../../hooks/state_selectors/use_with_input_placeholder';
import { useDataTestSubj } from '../../../hooks/state_selectors/use_data_test_subj';

const InputPlaceholderContainer = styled(EuiText)`
  position: absolute;
  pointer-events: none;
  padding-left: 0.5em;
  transform: translateY(-50%);
  width: 96%;
`;

export const InputPlaceholder = memo(() => {
  const textEntered = useWithInputTextEntered();
  const placeholder = useWithInputPlaceholder();
  const getTestId = useTestIdGenerator(useDataTestSubj());

  return (
    <InputPlaceholderContainer
      size="s"
      className="eui-textTruncate"
      data-test-subj={getTestId('inputPlaceholder')}
    >
      <EuiTextColor color="subdued" className="eui-textTruncate">
        {textEntered ? '' : placeholder}
      </EuiTextColor>
    </InputPlaceholderContainer>
  );
});
InputPlaceholder.displayName = 'InputPlaceholder';
