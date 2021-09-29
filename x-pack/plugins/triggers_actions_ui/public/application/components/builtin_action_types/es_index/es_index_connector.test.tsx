/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { mountWithIntl, nextTick } from '@kbn/test/jest';
import { act } from 'react-dom/test-utils';
import { EsIndexActionConnector } from '../types';
import IndexActionConnectorFields from './es_index_connector';
import { EuiComboBox, EuiSwitch, EuiSwitchEvent, EuiSelect } from '@elastic/eui';
jest.mock('../../../../common/lib/kibana');

jest.mock('../../../../common/index_controls', () => ({
  firstFieldOption: jest.fn(),
  getFields: jest.fn(),
  getIndexOptions: jest.fn(),
  getIndexPatterns: jest.fn(),
}));

const { getIndexPatterns } = jest.requireMock('../../../../common/index_controls');
getIndexPatterns.mockResolvedValueOnce([
  {
    id: 'indexPattern1',
    attributes: {
      title: 'indexPattern1',
    },
  },
  {
    id: 'indexPattern2',
    attributes: {
      title: 'indexPattern2',
    },
  },
]);

const { getFields } = jest.requireMock('../../../../common/index_controls');

async function setup(props: any) {
  const wrapper = mountWithIntl(<IndexActionConnectorFields {...props} />);
  await act(async () => {
    await nextTick();
    wrapper.update();
  });
  return wrapper;
}

function setupGetFieldsResponse(getFieldsWithDateMapping: boolean) {
  getFields.mockResolvedValueOnce([
    {
      type: getFieldsWithDateMapping ? 'date' : 'keyword',
      name: 'test1',
    },
    {
      type: 'text',
      name: 'test2',
    },
  ]);
}
describe('IndexActionConnectorFields renders', () => {
  test('renders correctly when creating connector', async () => {
    const props = {
      action: {
        actionTypeId: '.index',
        config: {},
        secrets: {},
      } as EsIndexActionConnector,
      editActionConfig: () => {},
      editActionSecrets: () => {},
      errors: { index: [] },
      readOnly: false,
    };
    const wrapper = mountWithIntl(<IndexActionConnectorFields {...props} />);

    expect(wrapper.find('[data-test-subj="connectorIndexesComboBox"]').exists()).toBeTruthy();
    expect(wrapper.find('[data-test-subj="indexRefreshCheckbox"]').exists()).toBeTruthy();

    // time field switch shouldn't show up initially
    expect(wrapper.find('[data-test-subj="hasTimeFieldCheckbox"]').exists()).toBeFalsy();
    expect(wrapper.find('[data-test-subj="executionTimeFieldSelect"]').exists()).toBeFalsy();

    const indexComboBox = wrapper
      .find(EuiComboBox)
      .filter('[data-test-subj="connectorIndexesComboBox"]');

    // time field switch should show up if index has date type field mapping
    setupGetFieldsResponse(true);
    await act(async () => {
      indexComboBox.prop('onChange')!([{ label: 'selection' }]);
      await nextTick();
      wrapper.update();
    });
    expect(wrapper.find('[data-test-subj="hasTimeFieldCheckbox"]').exists()).toBeTruthy();
    expect(wrapper.find('[data-test-subj="executionTimeFieldSelect"]').exists()).toBeFalsy();

    // time field switch should go away if index does not has date type field mapping
    setupGetFieldsResponse(false);
    await act(async () => {
      indexComboBox.prop('onChange')!([{ label: 'selection' }]);
      await nextTick();
      wrapper.update();
    });
    expect(wrapper.find('[data-test-subj="hasTimeFieldCheckbox"]').exists()).toBeFalsy();
    expect(wrapper.find('[data-test-subj="executionTimeFieldSelect"]').exists()).toBeFalsy();

    // time field dropdown should show up if index has date type field mapping and time switch is clicked
    setupGetFieldsResponse(true);
    await act(async () => {
      indexComboBox.prop('onChange')!([{ label: 'selection' }]);
      await nextTick();
      wrapper.update();
    });
    expect(wrapper.find('[data-test-subj="hasTimeFieldCheckbox"]').exists()).toBeTruthy();
    const timeFieldSwitch = wrapper
      .find(EuiSwitch)
      .filter('[data-test-subj="hasTimeFieldCheckbox"]');
    await act(async () => {
      timeFieldSwitch.prop('onChange')!({
        target: { checked: true },
      } as unknown as EuiSwitchEvent);
      await nextTick();
      wrapper.update();
    });
    expect(wrapper.find('[data-test-subj="executionTimeFieldSelect"]').exists()).toBeTruthy();
  });

  test('renders correctly when editing connector - no date type field mapping', async () => {
    const indexName = 'index-no-date-fields';
    const props = {
      action: {
        name: 'Index Connector for Index With No Date Type',
        actionTypeId: '.index',
        config: {
          index: indexName,
          refresh: false,
        },
        secrets: {},
      } as EsIndexActionConnector,
      editActionConfig: () => {},
      editActionSecrets: () => {},
      errors: { index: [] },
      readOnly: false,
    };
    setupGetFieldsResponse(false);
    const wrapper = await setup(props);

    expect(wrapper.find('[data-test-subj="connectorIndexesComboBox"]').exists()).toBeTruthy();
    expect(wrapper.find('[data-test-subj="indexRefreshCheckbox"]').exists()).toBeTruthy();

    // time related fields shouldn't show up
    expect(wrapper.find('[data-test-subj="hasTimeFieldCheckbox"]').exists()).toBeFalsy();
    expect(wrapper.find('[data-test-subj="executionTimeFieldSelect"]').exists()).toBeFalsy();

    const indexComboBox = wrapper
      .find(EuiComboBox)
      .filter('[data-test-subj="connectorIndexesComboBox"]');
    expect(indexComboBox.prop('selectedOptions')).toEqual([{ label: indexName, value: indexName }]);

    const refreshSwitch = wrapper.find(EuiSwitch).filter('[data-test-subj="indexRefreshCheckbox"]');
    expect(refreshSwitch.prop('checked')).toEqual(false);
  });

  test('renders correctly when editing connector - refresh set to true', async () => {
    const indexName = 'index-no-date-fields';
    const props = {
      action: {
        name: 'Index Connector for Index With No Date Type',
        actionTypeId: '.index',
        config: {
          index: indexName,
          refresh: true,
        },
        secrets: {},
      } as EsIndexActionConnector,
      editActionConfig: () => {},
      editActionSecrets: () => {},
      errors: { index: [] },
      readOnly: false,
    };
    setupGetFieldsResponse(false);
    const wrapper = await setup(props);

    expect(wrapper.find('[data-test-subj="connectorIndexesComboBox"]').exists()).toBeTruthy();
    expect(wrapper.find('[data-test-subj="indexRefreshCheckbox"]').exists()).toBeTruthy();
    expect(wrapper.find('[data-test-subj="hasTimeFieldCheckbox"]').exists()).toBeFalsy();
    expect(wrapper.find('[data-test-subj="executionTimeFieldSelect"]').exists()).toBeFalsy();

    const indexComboBox = wrapper
      .find(EuiComboBox)
      .filter('[data-test-subj="connectorIndexesComboBox"]');
    expect(indexComboBox.prop('selectedOptions')).toEqual([{ label: indexName, value: indexName }]);

    const refreshSwitch = wrapper.find(EuiSwitch).filter('[data-test-subj="indexRefreshCheckbox"]');
    expect(refreshSwitch.prop('checked')).toEqual(true);
  });

  test('renders correctly when editing connector - with date type field mapping but no time field selected', async () => {
    const indexName = 'index-no-date-fields';
    const props = {
      action: {
        name: 'Index Connector for Index With No Date Type',
        actionTypeId: '.index',
        config: {
          index: indexName,
          refresh: false,
        },
        secrets: {},
      } as EsIndexActionConnector,
      editActionConfig: () => {},
      editActionSecrets: () => {},
      errors: { index: [] },
      readOnly: false,
    };
    setupGetFieldsResponse(true);
    const wrapper = await setup(props);

    expect(wrapper.find('[data-test-subj="connectorIndexesComboBox"]').exists()).toBeTruthy();
    expect(wrapper.find('[data-test-subj="indexRefreshCheckbox"]').exists()).toBeTruthy();
    expect(wrapper.find('[data-test-subj="hasTimeFieldCheckbox"]').exists()).toBeTruthy();
    expect(wrapper.find('[data-test-subj="executionTimeFieldSelect"]').exists()).toBeFalsy();

    const indexComboBox = wrapper
      .find(EuiComboBox)
      .filter('[data-test-subj="connectorIndexesComboBox"]');
    expect(indexComboBox.prop('selectedOptions')).toEqual([{ label: indexName, value: indexName }]);

    const refreshSwitch = wrapper.find(EuiSwitch).filter('[data-test-subj="indexRefreshCheckbox"]');
    expect(refreshSwitch.prop('checked')).toEqual(false);

    const timeFieldSwitch = wrapper
      .find(EuiSwitch)
      .filter('[data-test-subj="hasTimeFieldCheckbox"]');
    expect(timeFieldSwitch.prop('checked')).toEqual(false);
  });

  test('renders correctly when editing connector - with date type field mapping and selected time field', async () => {
    const indexName = 'index-no-date-fields';
    const props = {
      action: {
        name: 'Index Connector for Index With No Date Type',
        actionTypeId: '.index',
        config: {
          index: indexName,
          refresh: false,
          executionTimeField: 'test1',
        },
        secrets: {},
      } as EsIndexActionConnector,
      editActionConfig: () => {},
      editActionSecrets: () => {},
      errors: { index: [] },
      readOnly: false,
    };
    setupGetFieldsResponse(true);
    const wrapper = await setup(props);

    expect(wrapper.find('[data-test-subj="connectorIndexesComboBox"]').exists()).toBeTruthy();
    expect(wrapper.find('[data-test-subj="indexRefreshCheckbox"]').exists()).toBeTruthy();
    expect(wrapper.find('[data-test-subj="hasTimeFieldCheckbox"]').exists()).toBeTruthy();
    expect(wrapper.find('[data-test-subj="executionTimeFieldSelect"]').exists()).toBeTruthy();

    const indexComboBox = wrapper
      .find(EuiComboBox)
      .filter('[data-test-subj="connectorIndexesComboBox"]');
    expect(indexComboBox.prop('selectedOptions')).toEqual([{ label: indexName, value: indexName }]);

    const refreshSwitch = wrapper.find(EuiSwitch).filter('[data-test-subj="indexRefreshCheckbox"]');
    expect(refreshSwitch.prop('checked')).toEqual(false);

    const timeFieldSwitch = wrapper
      .find(EuiSwitch)
      .filter('[data-test-subj="hasTimeFieldCheckbox"]');
    expect(timeFieldSwitch.prop('checked')).toEqual(true);

    const timeFieldSelect = wrapper
      .find(EuiSelect)
      .filter('[data-test-subj="executionTimeFieldSelect"]');
    expect(timeFieldSelect.prop('value')).toEqual('test1');
  });
});
