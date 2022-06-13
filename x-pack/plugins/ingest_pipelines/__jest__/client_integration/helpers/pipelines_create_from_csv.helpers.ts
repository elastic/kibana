/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act } from 'react-dom/test-utils';
import { HttpSetup } from 'src/core/public';
import { registerTestBed, TestBed, AsyncTestBedConfig } from '@kbn/test-jest-helpers';

import { PipelinesCreateFromCsv } from '../../../public/application/sections/pipelines_create_from_csv';
import { WithAppDependencies } from './setup_environment';
import { getCreateFromCsvPath, ROUTES } from '../../../public/application/services/navigation';

const testBedConfig: AsyncTestBedConfig = {
  memoryRouter: {
    initialEntries: [getCreateFromCsvPath()],
    componentRoutePath: ROUTES.createFromCsv,
  },
  doMountAsync: true,
};

export type PipelineCreateFromCsvTestBed = TestBed<PipelineCreateFromCsvTestSubjects> & {
  actions: ReturnType<typeof createFromCsvActions>;
};
const createFromCsvActions = (testBed: TestBed) => {
  // User Actions

  const selectCsvForUpload = (file?: File) => {
    const { find } = testBed;
    const csv = [file ? file : 'foo'] as any;

    act(() => {
      find('csvFilePicker').simulate('change', { files: csv });
    });
  };

  const clickProcessCsv = async () => {
    const { component, find } = testBed;

    await act(async () => {
      find('processFileButton').simulate('click');
    });

    component.update();
  };

  const uploadFile = async (file?: File) => {
    selectCsvForUpload(file);
    await clickProcessCsv();
  };

  return {
    selectCsvForUpload,
    clickProcessCsv,
    uploadFile,
  };
};

export const setup = async (httpSetup: HttpSetup): Promise<PipelineCreateFromCsvTestBed> => {
  const initTestBed = registerTestBed(
    WithAppDependencies(PipelinesCreateFromCsv, httpSetup),
    testBedConfig
  );
  const testBed = await initTestBed();

  return {
    ...testBed,
    actions: createFromCsvActions(testBed),
  };
};

export type PipelineCreateFromCsvTestSubjects =
  | 'pageTitle'
  | 'documentationLink'
  | 'processFileButton'
  | 'csvFilePicker'
  | 'errorCallout'
  | 'errorDetailsMessage'
  | 'pipelineMappingsJSONEditor'
  | 'continueToCreate'
  | 'copyToClipboard'
  | 'downloadJson';
