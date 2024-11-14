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

const getContext = (sourceFieldEnabled: boolean = true, hasEnterpriseLicense: boolean = true) =>
  ({
    config: {
      enableMappingsSourceFieldSection: sourceFieldEnabled,
    },
    plugins: {
      licensing: {
        license$: {
          subscribe: jest.fn((callback: any) => {
            callback({
              isActive: true,
              hasAtLeast: jest.fn((type: any) => hasEnterpriseLicense),
            });
            return { unsubscribe: jest.fn() };
          }),
        },
      },
    },
  } as unknown as AppDependencies);

describe('Mappings editor: configuration form', () => {
  let testBed: TestBed<TestSubjects>;

  it('renders the form', async () => {
    await act(async () => {
      testBed = setup({ esNodesPlugins: [] }, getContext());
    });
    testBed.component.update();
    const { exists } = testBed;

    expect(exists('advancedConfiguration')).toBe(true);
  });

  describe('_source field', () => {
    describe('renders depending on enableMappingsSourceFieldSection config', () => {
      it('renders when config set to true', async () => {
        await act(async () => {
          testBed = setup({ esNodesPlugins: [] }, getContext(true));
        });
        testBed.component.update();
        const { exists } = testBed;

        expect(exists('sourceField')).toBe(true);
      });

      it("doesn't render when config set to false", async () => {
        await act(async () => {
          testBed = setup({ esNodesPlugins: [] }, getContext(false));
        });
        testBed.component.update();
        const { exists } = testBed;

        expect(exists('sourceField')).toBe(false);
      });
    });

    describe('has synthetic option depending on license', () => {
      it('has synthetic option on enterprise license', async () => {
        await act(async () => {
          testBed = setup({ esNodesPlugins: [] }, getContext(true, true));
        });
        testBed.component.update();
        const { exists, find } = testBed;

        // Clicking on the field to open the options dropdown
        find('sourceValueField').simulate('click');
        expect(exists('syntheticSourceFieldOption')).toBe(true);
      });

      it("doesn't have synthetic option on lower than enterprise license", async () => {
        await act(async () => {
          testBed = setup({ esNodesPlugins: [] }, getContext(true, false));
        });
        testBed.component.update();
        const { exists, find } = testBed;

        // Clicking on the field to open the options dropdown
        find('sourceValueField').simulate('click');
        expect(exists('syntheticSourceFieldOption')).toBe(false);
      });
    });

    describe('has correct default value', () => {
      it("defaults to 'stored' if index mode prop is 'standard'", async () => {
        await act(async () => {
          testBed = setup({ esNodesPlugins: [], indexMode: 'standard' }, getContext());
        });
        testBed.component.update();
        const { find } = testBed;

        // Check that the stored option is selected
        expect(find('sourceValueField').text()).toBe('Stored _source');
      });

      it("defaults to 'synthetic' if index mode prop is 'logsdb'", async () => {
        await act(async () => {
          testBed = setup({ esNodesPlugins: [], indexMode: 'logsdb' }, getContext());
        });
        testBed.component.update();
        const { find } = testBed;

        // Check that the synthetic option is selected
        expect(find('sourceValueField').text()).toBe('Synthetic _source');
      });

      it("defaults to 'synthetic' if index mode prop is 'time_series'", async () => {
        await act(async () => {
          testBed = setup({ esNodesPlugins: [], indexMode: 'time_series' }, getContext());
        });
        testBed.component.update();
        const { find } = testBed;

        // Check that the synthetic option is selected
        expect(find('sourceValueField').text()).toBe('Synthetic _source');
      });
    });
  });
});
