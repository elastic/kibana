/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiCodeBlock } from '@elastic/eui';
import React, { useMemo } from 'react';
import styled from 'styled-components';

import { omitTypenameAndEmpty } from '../../../timelines/components/timeline/body/helpers';

interface Props {
  rawEventData: object | undefined;
}

const EuiCodeEditorContainer = styled.div`
  .euiCodeEditorWrapper {
    position: absolute;
  }
`;

export const JsonView = React.memo<Props>(({ rawEventData }) => {
  const value = useMemo(
    () =>
      JSON.stringify(
        rawEventData,
        omitTypenameAndEmpty,
        2 // indent level
      ),
    [rawEventData]
  );

  return (
    <EuiCodeEditorContainer>
      <EuiCodeBlock
        language="json"
        fontSize="m"
        paddingSize="m"
        isCopyable
        data-test-subj="jsonView"
      >
        {value}
      </EuiCodeBlock>
    </EuiCodeEditorContainer>
  );
});

JsonView.displayName = 'JsonView';
