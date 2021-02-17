/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiCodeEditor } from '@elastic/eui';
import { set } from '@elastic/safer-lodash-set/fp';
import React, { useMemo } from 'react';
import styled from 'styled-components';

import { TimelineEventsDetailsItem } from '../../../../common/search_strategy';
import { omitTypenameAndEmpty } from '../../../timelines/components/timeline/body/helpers';

interface Props {
  data: TimelineEventsDetailsItem[];
}

const EuiCodeEditorContainer = styled.div`
  .euiCodeEditorWrapper {
    position: absolute;
  }
`;

const EDITOR_SET_OPTIONS = { fontSize: '12px' };

export const JsonView = React.memo<Props>(({ data }) => {
  const value = useMemo(
    () =>
      JSON.stringify(
        buildJsonView(data),
        omitTypenameAndEmpty,
        2 // indent level
      ),
    [data]
  );

  return (
    <EuiCodeEditorContainer>
      <EuiCodeEditor
        data-test-subj="jsonView"
        isReadOnly
        mode="javascript"
        setOptions={EDITOR_SET_OPTIONS}
        value={value}
        width="100%"
        height="100%"
      />
    </EuiCodeEditorContainer>
  );
});

JsonView.displayName = 'JsonView';

export const buildJsonView = (data: TimelineEventsDetailsItem[]) =>
  data.reduce(
    (accumulator, item) =>
      set(
        item.field,
        Array.isArray(item.originalValue) ? item.originalValue.join() : item.originalValue,
        accumulator
      ),
    {}
  );
