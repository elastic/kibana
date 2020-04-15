/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { registerTestBed } from '../../../../../../test_utils';
import { PipelineEditor, Props } from '../pipeline_editor';

const testBedSetup = registerTestBed<TestSubject>(PipelineEditor, { doMountAsync: false });

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
