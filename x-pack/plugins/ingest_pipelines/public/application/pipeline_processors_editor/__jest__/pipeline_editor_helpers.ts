/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { registerTestBed } from '../../../../../../test_utils';
import { PipelineProcessorsEditor, Props } from '../pipeline_procssors_editor';

const testBedSetup = registerTestBed<TestSubject>(PipelineProcessorsEditor, { doMountAsync: false });

export const setup = async (props: Props) => {
  const { find, component } = await testBedSetup(props);
  const clickDoneButton = async () => {
    const button = await find('pipelineEditorDoneButton');
    button.simulate('click');
  };

  return {
    component,
    clickDoneButton,
  };
};

type TestSubject = 'pipelineEditorDoneButton';
