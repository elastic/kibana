/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { registerTestBed, TestBed } from '../../../../../../../test_utils';
import { PipelineProcessorsEditor, Props } from '../pipeline_processors_editor.container';

const testBedSetup = registerTestBed<TestSubject>(PipelineProcessorsEditor, {
  doMountAsync: false,
});

export interface SetupResult extends TestBed<TestSubject> {
  actions: {
    toggleOnFailure: () => void;
  };
}

export const setup = async (props: Props): Promise<SetupResult> => {
  const testBed = await testBedSetup(props);
  const toggleOnFailure = () => {
    const { find } = testBed;
    find('pipelineEditorOnFailureToggle').simulate('click');
  };

  return {
    ...testBed,
    actions: { toggleOnFailure },
  };
};

type TestSubject =
  | 'pipelineEditorDoneButton'
  | 'pipelineEditorOnFailureToggle'
  | 'pipelineEditorOnFailureTree';
