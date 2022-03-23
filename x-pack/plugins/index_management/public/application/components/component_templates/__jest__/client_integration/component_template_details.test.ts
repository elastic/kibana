/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act } from 'react-dom/test-utils';

import { setupEnvironment, pageHelpers } from './helpers';
import { ComponentTemplateDetailsTestBed } from './helpers/component_template_details.helpers';
import { ComponentTemplateDeserialized } from '../../shared_imports';

const { setup } = pageHelpers.componentTemplateDetails;

const COMPONENT_TEMPLATE: ComponentTemplateDeserialized = {
  name: 'comp-1',
  template: {
    mappings: { properties: { ip_address: { type: 'ip' } } },
    aliases: { mydata: {} },
    settings: { number_of_shards: 1 },
  },
  version: 1,
  _meta: { description: 'component template test' },
  _kbnMeta: { usedBy: ['template_1'], isManaged: false },
};

const COMPONENT_TEMPLATE_ONLY_REQUIRED_FIELDS: ComponentTemplateDeserialized = {
  name: 'comp-base',
  template: {},
  _kbnMeta: { usedBy: [], isManaged: false },
};

describe('<ComponentTemplateDetails />', () => {
  const { httpSetup, httpRequestsMockHelpers } = setupEnvironment();
  let testBed: ComponentTemplateDetailsTestBed;

  describe('With component template details', () => {
    beforeEach(async () => {
      httpRequestsMockHelpers.setLoadComponentTemplateResponse(COMPONENT_TEMPLATE.name, COMPONENT_TEMPLATE);

      await act(async () => {
        testBed = setup(httpSetup, {
          componentTemplateName: COMPONENT_TEMPLATE.name,
          onClose: () => {},
        });
      });

      testBed.component.update();
    });

    test('renders the details flyout', () => {
      const { exists, find, actions, component } = testBed;

      // Verify flyout exists with correct title
      expect(find('title').text()).toBe(COMPONENT_TEMPLATE.name);

      // Verify footer does not display since "actions" prop was not provided
      expect(exists('footer')).toBe(false);

      // Verify tabs exist
      expect(exists('settingsTab')).toBe(true);
      expect(exists('mappingsTab')).toBe(true);
      expect(exists('aliasesTab')).toBe(true);
      // Summary tab should be active by default
      expect(find('summaryTab').props()['aria-selected']).toBe(true);

      // [Summary tab] Verify description list items
      expect(exists('summaryTabContent.usedByTitle')).toBe(true);
      expect(exists('summaryTabContent.versionTitle')).toBe(true);
      expect(exists('summaryTabContent.metaTitle')).toBe(true);

      // [Settings tab] Navigate to tab and verify content
      act(() => {
        actions.clickSettingsTab();
      });

      component.update();

      expect(exists('settingsTabContent')).toBe(true);

      // [Mappings tab] Navigate to tab and verify content
      act(() => {
        actions.clickMappingsTab();
      });

      component.update();
      expect(exists('mappingsTabContent')).toBe(true);

      // [Aliases tab] Navigate to tab and verify content
      act(() => {
        actions.clickAliasesTab();
      });

      component.update();
      expect(exists('aliasesTabContent')).toBe(true);
    });
  });

  describe('With only required component template fields', () => {
    beforeEach(async () => {
      httpRequestsMockHelpers.setLoadComponentTemplateResponse(
        COMPONENT_TEMPLATE_ONLY_REQUIRED_FIELDS.name,
        COMPONENT_TEMPLATE_ONLY_REQUIRED_FIELDS
      );

      await act(async () => {
        testBed = setup(httpSetup, {
          componentTemplateName: COMPONENT_TEMPLATE_ONLY_REQUIRED_FIELDS.name,
          onClose: () => {},
        });
      });

      testBed.component.update();
    });

    test('renders the details flyout', () => {
      const { exists, actions, component } = testBed;

      // [Summary tab] Verify optional description list items do not display
      expect(exists('summaryTabContent.usedByTitle')).toBe(false);
      expect(exists('summaryTabContent.versionTitle')).toBe(false);
      expect(exists('summaryTabContent.metaTitle')).toBe(false);
      // Verify callout renders indicating the component template is not in use
      expect(exists('notInUseCallout')).toBe(true);

      // [Settings tab] Navigate to tab and verify info callout
      act(() => {
        actions.clickSettingsTab();
      });

      component.update();

      expect(exists('noSettingsCallout')).toBe(true);

      // [Mappings tab] Navigate to tab and verify info callout
      act(() => {
        actions.clickMappingsTab();
      });

      component.update();
      expect(exists('noMappingsCallout')).toBe(true);

      // [Aliases tab] Navigate to tab and verify info callout
      act(() => {
        actions.clickAliasesTab();
      });

      component.update();
      expect(exists('noAliasesCallout')).toBe(true);
    });
  });

  describe('With actions', () => {
    beforeEach(async () => {
      httpRequestsMockHelpers.setLoadComponentTemplateResponse(COMPONENT_TEMPLATE.name, COMPONENT_TEMPLATE);

      await act(async () => {
        testBed = setup(httpSetup, {
          componentTemplateName: COMPONENT_TEMPLATE.name,
          onClose: () => {},
          actions: [
            {
              name: 'Test',
              icon: 'info',
              closePopoverOnClick: true,
              handleActionClick: () => {},
            },
          ],
        });
      });

      testBed.component.update();
    });

    test('should render a footer with context menu', () => {
      const { exists, actions, component, find } = testBed;

      // Verify footer exists
      expect(exists('footer')).toBe(true);
      expect(exists('manageComponentTemplateButton')).toBe(true);

      // Click manage button and verify actions
      act(() => {
        actions.clickManageButton();
      });

      component.update();

      expect(exists('manageComponentTemplateContextMenu')).toBe(true);
      expect(find('manageComponentTemplateContextMenu.action').length).toEqual(1);
    });
  });

  describe('Error handling', () => {
    const error = {
      statusCode: 500,
      error: 'Internal server error',
      message: 'Internal server error',
    };

    beforeEach(async () => {
      httpRequestsMockHelpers.setLoadComponentTemplateResponse(COMPONENT_TEMPLATE.name, undefined, error);

      await act(async () => {
        testBed = setup(httpSetup, {
          componentTemplateName: COMPONENT_TEMPLATE.name,
          onClose: () => {},
        });
      });

      testBed.component.update();
    });

    test('should render an error message if error fetching pipelines', async () => {
      const { exists, find } = testBed;

      expect(exists('sectionError')).toBe(true);
      expect(find('sectionError').text()).toContain('Error loading component template');
    });
  });
});
