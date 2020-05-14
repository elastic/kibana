/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';
import { shallow } from 'enzyme';
import { ELASTICSEARCH_SYSTEM_ID } from '../../../common/constants';

describe('SetupModeRenderer', () => {
  beforeEach(() => jest.resetModules());

  it('should render with setup mode disabled', () => {
    jest.doMock('../../lib/setup_mode', () => ({
      getSetupModeState: () => ({
        enabled: false,
      }),
      initSetupModeState: () => {},
      updateSetupModeData: () => {},
      setSetupModeMenuItem: () => {},
    }));
    const SetupModeRenderer = require('./setup_mode').SetupModeRenderer;

    const ChildComponent = () => <h1>Hi</h1>;
    const scope = {};
    const injector = {};
    const component = shallow(
      <SetupModeRenderer
        scope={scope}
        injector={injector}
        productName={ELASTICSEARCH_SYSTEM_ID}
        render={({ setupMode, flyoutComponent, bottomBarComponent }) => (
          <Fragment>
            {flyoutComponent}
            <ChildComponent setupMode={setupMode} />
            {bottomBarComponent}
          </Fragment>
        )}
      />
    );

    expect(component).toMatchSnapshot();
  });

  it('should render with setup mode enabled', () => {
    jest.doMock('../../lib/setup_mode', () => ({
      getSetupModeState: () => ({
        enabled: true,
        data: {
          elasticsearch: {},
          _meta: {},
        },
      }),
      initSetupModeState: () => {},
      updateSetupModeData: () => {},
      setSetupModeMenuItem: () => {},
    }));
    const SetupModeRenderer = require('./setup_mode').SetupModeRenderer;

    const ChildComponent = () => <h1>Hi</h1>;
    const scope = {};
    const injector = {};
    const component = shallow(
      <SetupModeRenderer
        scope={scope}
        injector={injector}
        productName={ELASTICSEARCH_SYSTEM_ID}
        render={({ setupMode, flyoutComponent, bottomBarComponent }) => (
          <Fragment>
            {flyoutComponent}
            <ChildComponent setupMode={setupMode} />
            {bottomBarComponent}
          </Fragment>
        )}
      />
    );

    expect(component).toMatchSnapshot();
  });

  it('should render the flyout open', () => {
    jest.doMock('../../lib/setup_mode', () => ({
      getSetupModeState: () => ({
        enabled: true,
        data: {
          elasticsearch: {
            byUuid: {},
          },
          _meta: {},
        },
      }),
      initSetupModeState: () => {},
      updateSetupModeData: () => {},
      setSetupModeMenuItem: () => {},
    }));
    const SetupModeRenderer = require('./setup_mode').SetupModeRenderer;

    const ChildComponent = () => <h1>Hi</h1>;
    const scope = {};
    const injector = {};
    const component = shallow(
      <SetupModeRenderer
        scope={scope}
        injector={injector}
        productName={ELASTICSEARCH_SYSTEM_ID}
        render={({ setupMode, flyoutComponent, bottomBarComponent }) => (
          <Fragment>
            {flyoutComponent}
            <ChildComponent setupMode={setupMode} />
            {bottomBarComponent}
          </Fragment>
        )}
      />
    );

    component.setState({ isFlyoutOpen: true });
    component.update();
    expect(component).toMatchSnapshot();
  });

  it('should handle a new node/instance scenario', () => {
    jest.doMock('../../lib/setup_mode', () => ({
      getSetupModeState: () => ({
        enabled: true,
        data: {
          elasticsearch: {
            byUuid: {},
          },
          _meta: {},
        },
      }),
      initSetupModeState: () => {},
      updateSetupModeData: () => {},
      setSetupModeMenuItem: () => {},
    }));
    const SetupModeRenderer = require('./setup_mode').SetupModeRenderer;

    const ChildComponent = () => <h1>Hi</h1>;
    const scope = {};
    const injector = {};
    const component = shallow(
      <SetupModeRenderer
        scope={scope}
        injector={injector}
        productName={ELASTICSEARCH_SYSTEM_ID}
        render={({ setupMode, flyoutComponent, bottomBarComponent }) => (
          <Fragment>
            {flyoutComponent}
            <ChildComponent setupMode={setupMode} />
            {bottomBarComponent}
          </Fragment>
        )}
      />
    );

    component.setState({ isFlyoutOpen: true, instance: null, isSettingUpNew: true });
    component.update();
    expect(component.find('Flyout').prop('product')).toEqual({ isNetNewUser: true });
  });

  it('should use a new product found in the api response', () => {
    const newProduct = { id: 1 };

    jest.useFakeTimers();
    jest.doMock('../../lib/setup_mode', () => ({
      getSetupModeState: () => ({
        enabled: true,
        data: {
          elasticsearch: {
            byUuid: {
              2: newProduct,
            },
          },
          _meta: {},
        },
      }),
      initSetupModeState: (_scope, _injectir, cb) => {
        setTimeout(() => {
          cb({
            elasticsearch: {
              byUuid: {
                1: {},
              },
            },
          });
        }, 500);
      },
      updateSetupModeData: () => {},
      setSetupModeMenuItem: () => {},
    }));
    const SetupModeRenderer = require('./setup_mode').SetupModeRenderer;

    const ChildComponent = () => <h1>Hi</h1>;
    const scope = {};
    const injector = {};
    const component = shallow(
      <SetupModeRenderer
        scope={scope}
        injector={injector}
        productName={ELASTICSEARCH_SYSTEM_ID}
        render={({ setupMode, flyoutComponent, bottomBarComponent }) => (
          <Fragment>
            {flyoutComponent}
            <ChildComponent setupMode={setupMode} />
            {bottomBarComponent}
          </Fragment>
        )}
      />
    );

    component.setState({ isFlyoutOpen: true });
    component.update();

    jest.advanceTimersByTime(1000);
    expect(component.state('renderState')).toBe(true);
    expect(component.state('newProduct')).toBe(newProduct);
    expect(component.find('Flyout').prop('product')).toBe(newProduct);
  });

  it('should set the top menu items', () => {
    const newProduct = { id: 1 };

    const setSetupModeMenuItem = jest.fn();
    jest.doMock('../../lib/setup_mode', () => ({
      getSetupModeState: () => ({
        enabled: true,
        data: {
          elasticsearch: {
            byUuid: {
              2: newProduct,
            },
          },
          _meta: {},
        },
      }),
      initSetupModeState: (_scope, _injectir, cb) => {
        setTimeout(() => {
          cb({
            elasticsearch: {
              byUuid: {
                1: {},
              },
            },
          });
        }, 500);
      },
      updateSetupModeData: () => {},
      setSetupModeMenuItem,
    }));
    const SetupModeRenderer = require('./setup_mode').SetupModeRenderer;

    const ChildComponent = () => <h1>Hi</h1>;
    const scope = {};
    const injector = {};
    const component = shallow(
      <SetupModeRenderer
        scope={scope}
        injector={injector}
        productName={ELASTICSEARCH_SYSTEM_ID}
        render={({ setupMode, flyoutComponent, bottomBarComponent }) => (
          <Fragment>
            {flyoutComponent}
            <ChildComponent setupMode={setupMode} />
            {bottomBarComponent}
          </Fragment>
        )}
      />
    );

    component.setState({ isFlyoutOpen: true });
    component.update();
    expect(setSetupModeMenuItem).toHaveBeenCalled();
  });
});
