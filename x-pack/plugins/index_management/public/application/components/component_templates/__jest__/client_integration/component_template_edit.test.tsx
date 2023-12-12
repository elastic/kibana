/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act } from 'react-dom/test-utils';

import { breadcrumbService, IndexManagementBreadcrumb } from '../../../../services/breadcrumbs';
import { setupEnvironment } from './helpers';
import { API_BASE_PATH } from './helpers/constants';
import { setup, ComponentTemplateEditTestBed } from './helpers/component_template_edit.helpers';

jest.mock('@kbn/kibana-react-plugin/public', () => {
  const original = jest.requireActual('@kbn/kibana-react-plugin/public');
  return {
    ...original,
    // Mocking CodeEditor, which uses React Monaco under the hood
    CodeEditor: (props: any) => (
      <input
        data-test-subj={props['data-test-subj'] || 'mockCodeEditor'}
        data-currentvalue={props.value}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
          props.onChange(e.currentTarget.getAttribute('data-currentvalue'));
        }}
      />
    ),
  };
});

jest.mock('@elastic/eui', () => {
  const original = jest.requireActual('@elastic/eui');

  return {
    ...original,
    // Mocking EuiComboBox, as it utilizes "react-virtualized" for rendering search suggestions,
    // which does not produce a valid component wrapper
    EuiComboBox: (props: any) => (
      <input
        data-test-subj="mockComboBox"
        onChange={(syntheticEvent: any) => {
          props.onChange([syntheticEvent['0']]);
        }}
      />
    ),
  };
});

jest.mock('@kbn/kibana-react-plugin/public', () => {
  const original = jest.requireActual('@kbn/kibana-react-plugin/public');
  return {
    ...original,
    // Mocking CodeEditor, which uses React Monaco under the hood
    CodeEditor: (props: any) => (
      <input
        data-test-subj={props['data-test-subj'] || 'mockCodeEditor'}
        data-currentvalue={props.value}
        onChange={(e: any) => {
          props.onChange(e.jsonContent);
        }}
      />
    ),
  };
});

describe('<ComponentTemplateEdit />', () => {
  let testBed: ComponentTemplateEditTestBed;

  const { httpSetup, httpRequestsMockHelpers } = setupEnvironment();
  jest.spyOn(breadcrumbService, 'setBreadcrumbs');

  const COMPONENT_TEMPLATE_NAME = 'comp-1';
  const COMPONENT_TEMPLATE_TO_EDIT = {
    name: COMPONENT_TEMPLATE_NAME,
    template: {
      settings: { number_of_shards: 1 },
    },
    _kbnMeta: { usedBy: [], isManaged: false },
  };

  beforeEach(async () => {
    httpRequestsMockHelpers.setLoadComponentTemplateResponse(
      COMPONENT_TEMPLATE_TO_EDIT.name,
      COMPONENT_TEMPLATE_TO_EDIT
    );
    httpRequestsMockHelpers.setGetComponentTemplateDatastream(COMPONENT_TEMPLATE_TO_EDIT.name, {
      data_streams: [],
    });

    await act(async () => {
      testBed = await setup(httpSetup);
    });

    testBed.component.update();
  });

  test('updates the breadcrumbs to component templates', () => {
    expect(breadcrumbService.setBreadcrumbs).toHaveBeenLastCalledWith(
      IndexManagementBreadcrumb.componentTemplateEdit
    );
  });

  test('should set the correct page title', () => {
    const { exists, find } = testBed;

    expect(exists('pageTitle')).toBe(true);
    expect(find('pageTitle').text()).toEqual(
      `Edit component template '${COMPONENT_TEMPLATE_NAME}'`
    );
  });

  it('should set the name field to read only', () => {
    const { find } = testBed;

    const nameInput = find('nameField.input');
    expect(nameInput.props().disabled).toEqual(true);
  });

  it('should allow to go directly to a step', async () => {
    await act(async () => {
      testBed = await setup(httpSetup, '?step=mappings');
    });

    testBed.component.update();

    expect(testBed.exists('mappingsEditor')).toBe(true);
  });

  describe('form payload', () => {
    it('should send the correct payload with changed values', async () => {
      const { actions, component, form, coreStart } = testBed;

      await act(async () => {
        form.setInputValue('versionField.input', '1');
      });

      await act(async () => {
        actions.clickNextButton();
      });

      component.update();

      await actions.completeStepSettings();
      await actions.completeStepMappings();
      await actions.completeStepAliases();

      await act(async () => {
        actions.clickNextButton();
      });

      component.update();

      expect(httpSetup.put).toHaveBeenLastCalledWith(
        `${API_BASE_PATH}/component_templates/${COMPONENT_TEMPLATE_TO_EDIT.name}`,
        expect.objectContaining({
          body: JSON.stringify({
            ...COMPONENT_TEMPLATE_TO_EDIT,
            template: {
              ...COMPONENT_TEMPLATE_TO_EDIT.template,
            },
            version: 1,
          }),
        })
      );
      // Mapping rollout modal should not be opened if the component template is not managed by Fleet
      expect(coreStart.overlays.openModal).not.toBeCalled();
    });
  });

  describe('managed by fleet', () => {
    const DATASTREAM_NAME = 'logs-test-default';
    beforeEach(async () => {
      httpRequestsMockHelpers.setLoadComponentTemplateResponse(
        COMPONENT_TEMPLATE_TO_EDIT.name,
        Object.assign({}, COMPONENT_TEMPLATE_TO_EDIT, {
          _meta: { managed_by: 'fleet' },
        })
      );

      httpRequestsMockHelpers.setGetComponentTemplateDatastream(COMPONENT_TEMPLATE_TO_EDIT.name, {
        data_streams: [DATASTREAM_NAME],
      });

      await act(async () => {
        testBed = await setup(httpSetup);
      });

      testBed.component.update();
    });

    it('should show mappings rollover modal on save if apply mappings call failed', async () => {
      httpRequestsMockHelpers.setPostDatastreamMappingsFromTemplate(
        DATASTREAM_NAME,
        {},
        { message: 'Bad request', statusCode: 400 }
      );
      const { actions, component, form, coreStart } = testBed;

      await act(async () => {
        form.setInputValue('versionField.input', '1');
      });

      await act(async () => {
        actions.clickNextButton();
      });

      component.update();

      await actions.completeStepSettings();
      await actions.completeStepMappings();
      await actions.completeStepAliases();

      await act(async () => {
        actions.clickNextButton();
      });

      component.update();

      expect(httpSetup.put).toHaveBeenLastCalledWith(
        `${API_BASE_PATH}/component_templates/${COMPONENT_TEMPLATE_TO_EDIT.name}`,
        expect.anything()
      );
      expect(httpSetup.post).toHaveBeenLastCalledWith(
        `${API_BASE_PATH}/data_streams/${DATASTREAM_NAME}/mappings_from_template`,
        expect.anything()
      );

      expect(coreStart.overlays.openModal).toBeCalled();
    });

    it('should not show mappings rollover modal on save if apply mappings call succeed', async () => {
      httpRequestsMockHelpers.setPostDatastreamMappingsFromTemplate(DATASTREAM_NAME, {
        success: true,
      });
      const { actions, component, form, coreStart } = testBed;

      await act(async () => {
        form.setInputValue('versionField.input', '1');
      });

      await act(async () => {
        actions.clickNextButton();
      });

      component.update();

      await actions.completeStepSettings();
      await actions.completeStepMappings();
      await actions.completeStepAliases();

      await act(async () => {
        actions.clickNextButton();
      });

      component.update();

      expect(httpSetup.put).toHaveBeenLastCalledWith(
        `${API_BASE_PATH}/component_templates/${COMPONENT_TEMPLATE_TO_EDIT.name}`,
        expect.anything()
      );
      expect(httpSetup.post).toHaveBeenLastCalledWith(
        `${API_BASE_PATH}/data_streams/${DATASTREAM_NAME}/mappings_from_template`,
        expect.anything()
      );

      expect(coreStart.overlays.openModal).not.toBeCalled();
    });
  });
});
