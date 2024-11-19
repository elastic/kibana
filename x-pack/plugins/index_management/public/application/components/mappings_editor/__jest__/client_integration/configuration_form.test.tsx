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

const getContext = (sourceFieldEnabled: boolean = true) =>
  ({
    config: {
      enableMappingsSourceFieldSection: sourceFieldEnabled,
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
        jest.mock('../../mappings_state_context', () => ({
          useMappingsState: jest.fn().mockReturnValue({
            hasEnterpriseLicense: true,
          }),
        }));

        await act(async () => {
          testBed = setup({ esNodesPlugins: [] }, getContext(true));
        });
        testBed.component.update();
        const { exists, find } = testBed;

        // Clicking on the field to open the options dropdown
        find('sourceValueField').simulate('click');
        expect(exists('syntheticSourceFieldOption')).toBe(true);
      });

      it("doesn't have synthetic option on lower than enterprise license", async () => {
        jest.mock('../../mappings_state_context', () => ({
          useMappingsState: jest.fn().mockReturnValue({
            hasEnterpriseLicense: false,
          }),
        }));

        await act(async () => {
          testBed = setup({ esNodesPlugins: [] }, getContext(true));
        });
        testBed.component.update();
        const { exists, find } = testBed;

        // Clicking on the field to open the options dropdown
        find('sourceValueField').simulate('click');
        expect(exists('syntheticSourceFieldOption')).toBe(false);
      });
    });
  });
});
