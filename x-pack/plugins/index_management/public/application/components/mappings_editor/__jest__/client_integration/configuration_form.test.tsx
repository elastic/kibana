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
