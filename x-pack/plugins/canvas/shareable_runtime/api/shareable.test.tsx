/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mount } from 'enzyme';
import React from 'react';
import { sharedWorkpads, tick } from '../test';
import { share } from './shareable';

// Mock the renderers within this test.
jest.mock('../supported_renderers');

describe('Canvas Shareable Workpad API', () => {
  // Mock the AJAX load of the workpad.
  beforeEach(function () {
    global.fetch = jest.fn().mockImplementation(() => {
      const p = new Promise((resolve, _reject) => {
        resolve({
          ok: true,
          json: () => {
            return sharedWorkpads.hello;
          },
        });
      });
      return p;
    });
  });

  test('Placed successfully with default properties', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const wrapper = mount(<div kbn-canvas-shareable="canvas" kbn-canvas-url="workpad.json" />, {
      attachTo: container,
    });

    expect(wrapper.html()).toMatchSnapshot();

    share();
    await tick();

    expect(wrapper.html()).toMatchSnapshot();
  });

  test('Placed successfully with height specified', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const wrapper = mount(
      <div kbn-canvas-shareable="canvas" kbn-canvas-height="350" kbn-canvas-url="workpad.json" />,
      {
        attachTo: container,
      }
    );

    expect(wrapper.html()).toMatchSnapshot();
    share();
    await tick();
    expect(wrapper.html()).toMatch(
      /<div class=\"container\" style="height: 350px; width: 525px;\">/
    );
    expect(wrapper.html()).toMatchSnapshot();
  });

  test('Placed successfully with width specified', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const wrapper = mount(
      <div kbn-canvas-shareable="canvas" kbn-canvas-width="400" kbn-canvas-url="workpad.json" />,
      {
        attachTo: container,
      }
    );

    expect(wrapper.html()).toMatchSnapshot();
    share();
    await tick();
    expect(wrapper.html()).toMatch(
      /<div class=\"container\" style="height: 267px; width: 400px;\">/
    );
    expect(wrapper.html()).toMatchSnapshot();
  });

  test('Placed successfully with width and height specified', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const wrapper = mount(
      <div
        kbn-canvas-shareable="canvas"
        kbn-canvas-width="350"
        kbn-canvas-height="350"
        kbn-canvas-url="workpad.json"
      />,
      {
        attachTo: container,
      }
    );

    expect(wrapper.html()).toMatchSnapshot();
    share();
    await tick();
    expect(wrapper.html()).toMatch(
      /<div class=\"container\" style="height: 350px; width: 350px;\">/
    );
    expect(wrapper.html()).toMatchSnapshot();
  });

  test('Placed successfully with page specified', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const wrapper = mount(
      <div kbn-canvas-shareable="canvas" kbn-canvas-page="0" kbn-canvas-url="workpad.json" />,
      {
        attachTo: container,
      }
    );

    expect(wrapper.html()).toMatchSnapshot();
    share();
    await tick();
    expect(wrapper.html()).toMatchSnapshot();
  });
});
