/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { render } from 'react-dom';
import { NativeRenderer } from './native_renderer';

describe('native_renderer', () => {
  let mountpoint: Element;

  beforeEach(() => {
    mountpoint = document.createElement('div');
  });

  afterEach(() => {
    mountpoint.remove();
  });

  it('should render element in container', () => {
    const renderSpy = jest.fn();
    const testProps = { a: 'abc' };

    render(<NativeRenderer render={renderSpy} actualProps={testProps} />, mountpoint);
    const containerElement = mountpoint.firstElementChild;
    expect(renderSpy).toHaveBeenCalledWith(containerElement, testProps);
  });

  it('should not render again if props do not change', () => {
    const renderSpy = jest.fn();
    const testProps = { a: 'abc' };

    render(<NativeRenderer render={renderSpy} actualProps={testProps} />, mountpoint);
    render(<NativeRenderer render={renderSpy} actualProps={testProps} />, mountpoint);
    expect(renderSpy).toHaveBeenCalledTimes(1);
  });

  it('should not render again if props do not change shallowly', () => {
    const renderSpy = jest.fn();
    const testProps = { a: 'abc' };

    render(<NativeRenderer render={renderSpy} actualProps={testProps} />, mountpoint);
    render(<NativeRenderer render={renderSpy} actualProps={{ ...testProps }} />, mountpoint);
    expect(renderSpy).toHaveBeenCalledTimes(1);
  });

  it('should not render again for unchanged callback functions', () => {
    const renderSpy = jest.fn();
    const testCallback = () => {};
    const testState = { a: 'abc' };

    render(
      <NativeRenderer
        render={renderSpy}
        actualProps={{ state: testState, setState: testCallback }}
      />,
      mountpoint
    );
    render(
      <NativeRenderer
        render={renderSpy}
        actualProps={{ state: testState, setState: testCallback }}
      />,
      mountpoint
    );
    expect(renderSpy).toHaveBeenCalledTimes(1);
  });

  it('should render again once if props change', () => {
    const renderSpy = jest.fn();
    const testProps = { a: 'abc' };

    render(<NativeRenderer render={renderSpy} actualProps={testProps} />, mountpoint);
    render(<NativeRenderer render={renderSpy} actualProps={{ a: 'def' }} />, mountpoint);
    render(<NativeRenderer render={renderSpy} actualProps={{ a: 'def' }} />, mountpoint);
    expect(renderSpy).toHaveBeenCalledTimes(2);
    const containerElement = mountpoint.firstElementChild;
    expect(renderSpy).lastCalledWith(containerElement, { a: 'def' });
  });

  it('should render again if props are extended', () => {
    const renderSpy = jest.fn();
    const testProps = { a: 'abc' };

    render(<NativeRenderer render={renderSpy} actualProps={testProps} />, mountpoint);
    render(<NativeRenderer render={renderSpy} actualProps={{ a: 'abc', b: 'def' }} />, mountpoint);
    expect(renderSpy).toHaveBeenCalledTimes(2);
    const containerElement = mountpoint.firstElementChild;
    expect(renderSpy).lastCalledWith(containerElement, { a: 'abc', b: 'def' });
  });

  it('should render again if props are limited', () => {
    const renderSpy = jest.fn();
    const testProps = { a: 'abc', b: 'def' };

    render(<NativeRenderer render={renderSpy} actualProps={testProps} />, mountpoint);
    render(<NativeRenderer render={renderSpy} actualProps={{ a: 'abc' }} />, mountpoint);
    expect(renderSpy).toHaveBeenCalledTimes(2);
    const containerElement = mountpoint.firstElementChild;
    expect(renderSpy).lastCalledWith(containerElement, { a: 'abc' });
  });

  it('should render a div as container', () => {
    const renderSpy = jest.fn();
    const testProps = { a: 'abc' };

    render(<NativeRenderer render={renderSpy} actualProps={testProps} />, mountpoint);
    const containerElement: Element = mountpoint.firstElementChild!;
    expect(containerElement.nodeName).toBe('DIV');
  });

  it('should render a specified element as container', () => {
    const renderSpy = jest.fn();
    const testProps = { a: 'abc' };

    render(<NativeRenderer render={renderSpy} tag="span" actualProps={testProps} />, mountpoint);
    const containerElement: Element = mountpoint.firstElementChild!;
    expect(containerElement.nodeName).toBe('SPAN');
  });
});
