/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { shallowWithIntl } from '@kbn/test-jest-helpers';
import { PipelineList } from './pipeline_list';

describe('PipelineList component', () => {
  let props;
  let addDanger;
  let addSuccess;
  let addWarning;

  let pipelines;

  const getGetPipelineList = (isSuccess, result) =>
    isSuccess ? () => Promise.resolve(result) : () => Promise.reject(result);

  const getIsClusterInfoAvailable = (isAvailable) => () => Promise.resolve(isAvailable);

  const getDeleteSelectedPipelines = (isSuccess) =>
    isSuccess ? () => Promise.resolve({}) : () => Promise.reject({});

  beforeEach(() => {
    pipelines = [{ id: 'test', description: 'test description' }];
    addDanger = jest.fn();
    addSuccess = jest.fn();
    addWarning = jest.fn();
    props = {
      clusterService: {
        isClusterInfoAvailable: getIsClusterInfoAvailable(true),
        deleteSelectedPipelines: getDeleteSelectedPipelines(true),
      },
      isReadOnly: false,
      licenseService: {
        checkValidity: () => Promise.resolve(),
        message: 'the license service message',
      },
      monitoringService: {
        isMonitoringEnabled: () => true,
      },
      pipelinesService: {
        getPipelineList: getGetPipelineList(true, pipelines),
      },
      toastNotifications: {
        addDanger,
        addSuccess,
        addWarning,
      },
    };
  });

  async function renderWithProps() {
    const wrapper = shallowWithIntl(<PipelineList.WrappedComponent {...props} />);
    await Promise.all([wrapper.instance().componentDidMount]);
    return wrapper;
  }

  it('notifies the user if readonly after pipeline load', async () => {
    props.isReadOnly = true;
    await renderWithProps();
    expect(addWarning).toBeCalledWith('the license service message');
  });

  it('does not notify if not readonly', async () => {
    await renderWithProps();
    expect(addWarning).not.toBeCalled();
  });

  it('renders empty prompt for no pipelines', async () => {
    props.pipelinesService.getPipelineList = getGetPipelineList(true, []);
    const wrapper = await renderWithProps();
    const component = wrapper.instance();
    expect(component.state.message).toEqual(component.getEmptyPrompt());
  });

  it('notifies the user if pipeline load fails', async () => {
    props.pipelinesService.getPipelineList = getGetPipelineList(false, {
      status: 401,
      statusText: 'Unauthorized access',
    });
    props.isReadOnly = false;
    await renderWithProps();
    expect(addDanger).toBeCalledWith(`Couldn't load pipeline. Error: "Unauthorized access".`);
  });

  it('sets state to forbidden if 403 error and not readonly', async () => {
    props.pipelinesService.getPipelineList = getGetPipelineList(false, {
      status: 403,
    });
    props.isReadOnly = false;
    const wrapper = await renderWithProps();
    const component = wrapper.instance();
    expect(component.state.isLoading).toBe(false);
    expect(component.state.isForbidden).toBe(true);
  });

  it('is not forbidden if 403 and readonly is true', async () => {
    props.pipelinesService.getPipelineList = getGetPipelineList(false, {
      status: 403,
    });
    props.isReadOnly = true;
    const wrapper = await renderWithProps();
    const component = wrapper.instance();
    expect(component.state.isLoading).toBe(false);
    expect(component.state.isForbidden).toBe(false);
  });
});
