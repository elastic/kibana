/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';

import { useComponentTemplatesContext } from '../../component_templates_context';

import { useDatastreamsRollover } from './use_datastreams_rollover';

jest.mock('../../component_templates_context');

describe('useStepFromQueryString', () => {
  beforeEach(() => {
    jest.mocked(useComponentTemplatesContext).mockReturnValue({
      api: {
        getComponentTemplateDatastreams: jest.fn(),
        postDataStreamMappingsFromTemplate: jest.fn(),
      },
      startServices: {
        overlays: { openModal: jest.fn() },
      },
    } as any);
  });
  it('should do nothing if there no impacted data_streams', async () => {
    jest
      .mocked(useComponentTemplatesContext().api.getComponentTemplateDatastreams)
      .mockResolvedValue({ data: { data_streams: [] }, error: undefined });

    const {
      result: {
        current: { showDatastreamRolloverModal },
      },
    } = renderHook(() => useDatastreamsRollover());

    await showDatastreamRolloverModal('logs-test.data@custom');
  });

  it('should try to update mappings if there is impacted data_streams', async () => {
    const { api, startServices } = jest.mocked(useComponentTemplatesContext());

    api.getComponentTemplateDatastreams.mockResolvedValue({
      data: { data_streams: ['logs-test.data-default'] },
      error: undefined,
    });

    api.postDataStreamMappingsFromTemplate.mockResolvedValue({
      error: undefined,
      data: { data_streams: [] },
    });

    jest
      .mocked(useComponentTemplatesContext().startServices.overlays.openModal)
      .mockReturnValue({ onClose: jest.fn() } as any);

    const {
      result: {
        current: { showDatastreamRolloverModal },
      },
    } = renderHook(() => useDatastreamsRollover());

    await showDatastreamRolloverModal('logs-test.data@custom');

    expect(api.postDataStreamMappingsFromTemplate).toBeCalledTimes(1);
    expect(startServices.overlays.openModal).not.toBeCalled();
  });

  it('should show datastream rollover modal if there is an error when updating mappings', async () => {
    const { api, startServices } = jest.mocked(useComponentTemplatesContext());

    api.getComponentTemplateDatastreams.mockResolvedValue({
      data: { data_streams: ['logs-test.data-default'] },
      error: undefined,
    });

    api.postDataStreamMappingsFromTemplate.mockResolvedValue({
      error: new Error('test'),
      data: { data_streams: [] },
    });

    jest
      .mocked(useComponentTemplatesContext().startServices.overlays.openModal)
      .mockReturnValue({ onClose: jest.fn() } as any);

    const {
      result: {
        current: { showDatastreamRolloverModal },
      },
    } = renderHook(() => useDatastreamsRollover());

    await showDatastreamRolloverModal('logs-test.data@custom');
    expect(startServices.overlays.openModal).toBeCalled();
  });
});
