/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render } from 'enzyme';
import React from 'react';

import { EmbeddedMap } from './EmbeddedMap';
import { KibanaContextProvider } from '../../../../../../../../src/plugins/kibana_react/public';
import { embeddablePluginMock } from '../../../../../../../../src/plugins/embeddable/public/mocks';

describe('Embedded Map', () => {
  test('it renders', () => {
    const [core] = mockCore();

    const wrapper = render(
      <KibanaContextProvider services={{ ...core }}>
        <EmbeddedMap />
      </KibanaContextProvider>
    );

    expect(wrapper).toMatchSnapshot();
  });
});

const mockEmbeddable = embeddablePluginMock.createStartContract();

mockEmbeddable.getEmbeddableFactory = jest.fn().mockImplementation(() => ({
  create: () => ({
    reload: jest.fn(),
    setRenderTooltipContent: jest.fn(),
    setLayerList: jest.fn(),
  }),
}));

const mockCore: () => [any] = () => {
  const core = {
    embeddable: mockEmbeddable,
  };

  return [core];
};
