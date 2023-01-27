/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { CoreStart } from '@kbn/core/public';
import React, { ReactNode } from 'react';
import { createKibanaReactContext } from '@kbn/kibana-react-plugin/public';
import { MockApmPluginContextWrapper } from '../../../../../context/apm_plugin/mock_apm_plugin_context';
import { getLensAttributes } from './get_lens_attributes';
import { MostUsedChart, MostUsedMetricTypes } from '.';
import { HOST_OS_VERSION } from '../../../../../../common/es_fields/apm';

const mockEmbeddableComponent = jest.fn();

function Wrapper({ children }: { children?: ReactNode }) {
  const KibanaReactContext = createKibanaReactContext({
    lens: {
      EmbeddableComponent: mockEmbeddableComponent.mockReturnValue(
        <div data-test-subj="lens-mock" />
      ),
      canUseEditor: jest.fn(() => true),
      navigateToPrefilledEditor: jest.fn(),
    },
  } as Partial<CoreStart>);

  return (
    <MemoryRouter>
      <KibanaReactContext.Provider>
        <MockApmPluginContextWrapper>{children}</MockApmPluginContextWrapper>
      </KibanaReactContext.Provider>
    </MemoryRouter>
  );
}

const renderOptions = { wrapper: Wrapper };

describe('Most used chart with Lens', () => {
  const props = {
    metric: HOST_OS_VERSION as MostUsedMetricTypes,
    filters: [
      {
        meta: {},
        query: {
          term: {
            'processor.event': 'transaction',
          },
        },
      },
      {
        meta: {},
        query: {
          term: {
            'service.name': 'opbeans-swift',
          },
        },
      },
      {
        meta: {},
        query: {
          term: {
            'transaction.type': 'request',
          },
        },
      },
    ],
  };
  test('gets lens attributes', () => {
    expect(getLensAttributes(props)).toMatchSnapshot();
  });

  test('Renders most used chart with Lens', () => {
    const start = '2022-10-30T20%3A52%3A47.080Z';
    const end = '2022-10-31T20%3A52%3A47.080Z';

    render(
      <MostUsedChart
        title="Most used os version"
        start={start}
        end={end}
        metric={HOST_OS_VERSION as MostUsedMetricTypes}
        filters={props.filters}
      />,
      renderOptions
    );

    expect(mockEmbeddableComponent).toHaveBeenCalledTimes(1);
    expect(mockEmbeddableComponent.mock.calls[0][0]).toEqual(
      expect.objectContaining({
        timeRange: {
          from: start,
          to: end,
        },
        attributes: getLensAttributes(props),
      })
    );
  });
});
