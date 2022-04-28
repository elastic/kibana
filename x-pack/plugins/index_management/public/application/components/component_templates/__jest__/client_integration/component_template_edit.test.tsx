/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act } from 'react-dom/test-utils';

import '../../../../../../test/global_mocks';
import { setupEnvironment } from './helpers';
import { API_BASE_PATH } from './helpers/constants';
import { setup, ComponentTemplateEditTestBed } from './helpers/component_template_edit.helpers';

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

describe('<ComponentTemplateEdit />', () => {
  let testBed: ComponentTemplateEditTestBed;

  const { httpSetup, httpRequestsMockHelpers } = setupEnvironment();

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

    await act(async () => {
      testBed = await setup(httpSetup);
    });

    testBed.component.update();
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

  describe('form payload', () => {
    it('should send the correct payload with changed values', async () => {
      const { actions, component, form } = testBed;

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
    });
  });
});
