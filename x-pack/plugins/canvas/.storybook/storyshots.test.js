/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import path from 'path';
import moment from 'moment';
import 'moment-timezone';
import ReactDOM from 'react-dom';

import initStoryshots, { multiSnapshotWithOptions } from '@storybook/addon-storyshots';
import styleSheetSerializer from 'jest-styled-components/src/styleSheetSerializer';
import { addSerializer } from 'jest-specific-snapshot';

// Several of the renderers, used by the runtime, use jQuery.
import jquery from 'jquery';
global.$ = jquery;
global.jQuery = jquery;

// Set our default timezone to UTC for tests so we can generate predictable snapshots
moment.tz.setDefault('UTC');

// Freeze time for the tests for predictable snapshots
const testTime = new Date(Date.UTC(2019, 5, 1)); // June 1 2019
Date.now = jest.fn(() => testTime);

// Mock telemetry service
jest.mock('../public/lib/ui_metric', () => ({ trackCanvasUiMetric: () => {} }));

// Mock EUI generated ids to be consistently predictable for snapshots.
jest.mock(`@elastic/eui/lib/components/form/form_row/make_id`, () => () => `generated-id`);

// Jest automatically mocks SVGs to be a plain-text string that isn't an SVG.  Canvas uses
// them in examples, so let's mock a few for tests.
jest.mock('../canvas_plugin_src/renderers/shape/shapes', () => ({
  shapes: {
    arrow: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
      <polygon points="0,40 60,40 60,20 95,50 60,80 60,60 0,60" />
    </svg>`,
    square: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
      <rect x="0" y="0" width="100" height="100" />
    </svg>`,
  },
}));

// Mock react-datepicker dep used by eui to avoid rendering the entire large component
jest.mock('@elastic/eui/packages/react-datepicker', () => {
  return {
    __esModule: true,
    default: 'ReactDatePicker',
  };
});

// Mock React Portal for components that use modals, tooltips, etc
ReactDOM.createPortal = jest.fn(element => {
  return element;
});

jest.mock('@elastic/eui/lib/services/accessibility/html_id_generator', () => {
  return {
    htmlIdGenerator: () => () => `generated-id`,
  };
});

// Disabling this test due to https://github.com/elastic/eui/issues/2242
jest.mock(
  '../public/components/workpad_header/share_menu/flyout/__examples__/share_website_flyout.stories',
  () => {
    return 'Disabled Panel';
  }
);

// This element uses a `ref` and cannot be rendered by Jest snapshots.
import { RenderedElement } from '../shareable_runtime/components/rendered_element';
jest.mock('../shareable_runtime/components/rendered_element');
RenderedElement.mockImplementation(() => 'RenderedElement');

addSerializer(styleSheetSerializer);

// Initialize Storyshots and build the Jest Snapshots
initStoryshots({
  configPath: path.resolve(__dirname, './../.storybook'),
  test: multiSnapshotWithOptions({}),
});
