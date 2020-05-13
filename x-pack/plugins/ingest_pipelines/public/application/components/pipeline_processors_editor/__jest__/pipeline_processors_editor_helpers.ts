/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { registerTestBed } from '../../../../../../../test_utils';
import { PipelineProcessorsEditor, Props } from '../pipeline_processors_editor.container';

const testBedSetup = registerTestBed<TestSubject>(PipelineProcessorsEditor, {
  doMountAsync: false,
});

export const setup = async (props: Props) => {
  return testBedSetup(props);
};

type TestSubject = 'pipelineEditorDoneButton';
