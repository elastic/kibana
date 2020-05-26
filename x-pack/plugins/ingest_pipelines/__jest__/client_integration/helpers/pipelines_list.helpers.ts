/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { act } from 'react-dom/test-utils';

import { BASE_PATH } from '../../../common/constants';
import {
  registerTestBed,
  TestBed,
  TestBedConfig,
  findTestSubject,
  nextTick,
} from '../../../../../test_utils';
import { PipelinesList } from '../../../public/application/sections/pipelines_list';
import { WithAppDependencies } from './setup_environment';

const testBedConfig: TestBedConfig = {
  memoryRouter: {
    initialEntries: [BASE_PATH],
    componentRoutePath: BASE_PATH,
  },
  doMountAsync: true,
};

const initTestBed = registerTestBed(WithAppDependencies(PipelinesList), testBedConfig);

export type PipelineListTestBed = TestBed<PipelineListTestSubjects> & {
  actions: ReturnType<typeof createActions>;
};

const createActions = (testBed: TestBed) => {
  const { find } = testBed;

  /**
   * User Actions
   */
  const clickReloadButton = () => {
    find('reloadButton').simulate('click');
  };

  const clickPipelineAt = async (index: number) => {
    const { component, table, router } = testBed;
    const { rows } = table.getMetaData('pipelinesTable');
    const pipelineLink = findTestSubject(rows[index].reactWrapper, 'pipelineDetailsLink');

    await act(async () => {
      const { href } = pipelineLink.props();
      router.navigateTo(href!);
      await nextTick();
      component.update();
    });
  };

  const clickActionMenu = (pipelineName: string) => {
    const { component } = testBed;

    // When a table has > 2 actions, EUI displays an overflow menu with an id "<pipeline_name>-actions"
    component.find(`div[id="${pipelineName}-actions"] button`).simulate('click');
  };

  const clickPipelineAction = (pipelineName: string, action: 'edit' | 'clone' | 'delete') => {
    const actions = ['edit', 'clone', 'delete'];
    const { component } = testBed;

    clickActionMenu(pipelineName);

    component.find('.euiContextMenuItem').at(actions.indexOf(action)).simulate('click');
  };

  return {
    clickReloadButton,
    clickPipelineAt,
    clickPipelineAction,
    clickActionMenu,
  };
};

export const setup = async (): Promise<PipelineListTestBed> => {
  const testBed = await initTestBed();

  return {
    ...testBed,
    actions: createActions(testBed),
  };
};

export type PipelineListTestSubjects =
  | 'appTitle'
  | 'documentationLink'
  | 'createPipelineButton'
  | 'pipelinesTable'
  | 'pipelineDetails'
  | 'pipelineDetails.title'
  | 'deletePipelinesConfirmation'
  | 'emptyList'
  | 'emptyList.title'
  | 'sectionLoading'
  | 'pipelineLoadError'
  | 'reloadButton';
