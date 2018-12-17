/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  // @ts-ignore
  EuiCodeEditor,
} from '@elastic/eui';
import * as React from 'react';
import { pure } from 'recompose';
import styled from 'styled-components';

import { ECS } from '../timeline/ecs';

interface Props {
  data: ECS;
}

const JsonEditor = styled.div`
  width: 100%;
`;

export const JsonView = pure<Props>(({ data }) => (
  <JsonEditor data-test-subj="jsonView">
    <EuiCodeEditor
      isReadOnly
      mode="javascript"
      setOptions={{ fontSize: '12px' }}
      value={JSON.stringify(
        data,
        null,
        2 // indent level
      )}
      width="100%"
    />
    }
  </JsonEditor>
));
