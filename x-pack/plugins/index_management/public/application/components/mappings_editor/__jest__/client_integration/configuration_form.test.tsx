/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AppDependencies } from '../../../..';
import { registerTestBed, TestBed } from '@kbn/test-jest-helpers';
import { ConfigurationForm } from '../../components/configuration_form';
import { WithAppDependencies } from './helpers/setup_environment';
import { TestSubjects } from './helpers/mappings_editor.helpers';
import { act } from 'react-dom/test-utils';

const setup = (props: any = { onUpdate() {} }, appDependencies?: any) => {
  const setupTestBed = registerTestBed<TestSubjects>(
    WithAppDependencies(ConfigurationForm, appDependencies),
    {
      memoryRouter: {
        wrapComponent: false,
      },
      defaultProps: props,
    }
  );

  const testBed = setupTestBed();

  return testBed;
};

describe('Mappings editor: configuration form', () => {
  let testBed: TestBed<TestSubjects>;

  // TODO: Remove this beforeAll hook once https://github.com/elastic/kibana/pull/181710 is merged
  beforeAll(() => {
    // Mocking matchMedia to resolve TypeError: window.matchMedia is not a function
    // For more info, see https://jestjs.io/docs/manual-mocks#mocking-methods-which-are-not-implemented-in-jsdom
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: jest.fn().mockImplementation((query) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: jest.fn(), // deprecated
        removeListener: jest.fn(), // deprecated
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      })),
    });
  });

  it('renders the form', async () => {
    const ctx = {
      config: {
        enableMappingsSourceFieldSection: true,
      },
    } as unknown as AppDependencies;

    await act(async () => {
      testBed = setup({ esNodesPlugins: [] }, ctx);
    });
    testBed.component.update();
    const { exists } = testBed;

    expect(exists('advancedConfiguration')).toBe(true);
  });

  describe('_source field', () => {
    it('renders the _source field when it is enabled', async () => {
      const ctx = {
        config: {
          enableMappingsSourceFieldSection: true,
        },
      } as unknown as AppDependencies;

      await act(async () => {
        testBed = setup({ esNodesPlugins: [] }, ctx);
      });
      testBed.component.update();
      const { exists } = testBed;

      expect(exists('sourceField')).toBe(true);
    });

    it("doesn't render the _source field when it is disabled", async () => {
      const ctx = {
        config: {
          enableMappingsSourceFieldSection: false,
        },
      } as unknown as AppDependencies;

      await act(async () => {
        testBed = setup({ esNodesPlugins: [] }, ctx);
      });
      testBed.component.update();
      const { exists } = testBed;

      expect(exists('sourceField')).toBe(false);
    });
  });
});
