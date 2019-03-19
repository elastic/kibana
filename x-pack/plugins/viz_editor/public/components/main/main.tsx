/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiPage,
  EuiPageBody,
  EuiPageContent,
  EuiPageContentBody,
  EuiPageSideBar,
} from '@elastic/eui';
import React, { useState } from 'react';
import { initialState } from '../../lib';
import { ConfigEditor } from '../config_editor';
import { IndexPatternPanel } from '../index_pattern_panel';

interface Props {
  kfetch: (opts: any) => Promise<any>;
}

export function Main(props: Props) {
  const [state] = useState(initialState);

  return (
    <EuiPage>
      <EuiPageSideBar>
        <IndexPatternPanel indexPatterns={state.indexPatterns} />
      </EuiPageSideBar>
      <EuiPageBody className="vzBody">
        <EuiPageContent>
          <EuiPageContentBody className="vzTableContainer">
            {state.title}
            <div>TODO... a visualization n' such!</div>
          </EuiPageContentBody>
        </EuiPageContent>
        <ConfigEditor {...state} />
      </EuiPageBody>
    </EuiPage>
  );
}
