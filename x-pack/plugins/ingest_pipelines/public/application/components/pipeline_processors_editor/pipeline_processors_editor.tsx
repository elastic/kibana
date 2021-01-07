/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiSpacer, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';

import { usePipelineProcessorsContext } from './context';
import {
  ProcessorsEmptyPrompt,
  OnFailureProcessorsTitle,
  ProcessorsHeader,
  OnDoneLoadJsonHandler,
} from './components';
import { ProcessorsEditor, GlobalOnFailureProcessorsEditor } from './editors';

import './pipeline_processors_editor.scss';

interface Props {
  onLoadJson: OnDoneLoadJsonHandler;
}

export const PipelineProcessorsEditor: React.FunctionComponent<Props> = ({ onLoadJson }) => {
  const {
    state: { processors: allProcessors },
  } = usePipelineProcessorsContext();

  const {
    state: { processors, onFailure },
  } = allProcessors;

  const showEmptyPrompt = processors.length === 0 && onFailure.length === 0;

  let content: React.ReactNode;

  if (showEmptyPrompt) {
    content = <ProcessorsEmptyPrompt onLoadJson={onLoadJson} />;
  } else {
    content = (
      <>
        <ProcessorsEditor />

        <EuiSpacer size="s" />

        <OnFailureProcessorsTitle />

        <GlobalOnFailureProcessorsEditor />
      </>
    );
  }

  return (
    <div className="pipelineProcessorsEditor">
      <EuiFlexGroup gutterSize="m" responsive={false} direction="column">
        <EuiFlexItem grow={false}>
          <ProcessorsHeader onLoadJson={onLoadJson} hasProcessors={processors.length > 0} />
        </EuiFlexItem>
        <EuiFlexItem grow={false} className="pipelineProcessorsEditor__container">
          {content}
        </EuiFlexItem>
      </EuiFlexGroup>
    </div>
  );
};
