/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import React from 'react';

import {
  OnDoneLoadJsonHandler,
  OnFailureProcessorsTitle,
  ProcessorsEmptyPrompt,
  ProcessorsHeader,
} from './components';
import { usePipelineProcessorsContext } from './context';
import { GlobalOnFailureProcessorsEditor, ProcessorsEditor } from './editors';

import './pipeline_editor.scss';

interface Props {
  onLoadJson: OnDoneLoadJsonHandler;
}

export const PipelineEditor: React.FunctionComponent<Props> = ({ onLoadJson }) => {
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
    <div className="pipelineEditor">
      <EuiFlexGroup gutterSize="m" responsive={false} direction="column">
        <EuiFlexItem grow={false}>
          <ProcessorsHeader onLoadJson={onLoadJson} hasProcessors={processors.length > 0} />
        </EuiFlexItem>
        <EuiFlexItem grow={false} className="pipelineEditor__container">
          {content}
        </EuiFlexItem>
      </EuiFlexGroup>
    </div>
  );
};
