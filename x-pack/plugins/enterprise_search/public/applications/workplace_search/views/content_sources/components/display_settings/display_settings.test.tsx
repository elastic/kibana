/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import '../../../../../__mocks__/shallow_useeffect.mock';

import { setMockValues, setMockActions } from '../../../../../__mocks__/kea_logic';
import { exampleResult } from '../../../../__mocks__/content_sources.mock';

import React from 'react';

import { shallow } from 'enzyme';

import { EuiButton, EuiTabbedContent } from '@elastic/eui';

import { Loading } from '../../../../../shared/loading';
import { UnsavedChangesPrompt } from '../../../../../shared/unsaved_changes_prompt';
import { ViewContentHeader } from '../../../../components/shared/view_content_header';

import { DisplaySettings } from './display_settings';
import { FieldEditorModal } from './field_editor_modal';

describe('DisplaySettings', () => {
  const { exampleDocuments, searchResultConfig } = exampleResult;
  const initializeDisplaySettings = jest.fn();
  const setServerData = jest.fn();
  const setColorField = jest.fn();
  const handleSelectedTabChanged = jest.fn();

  const values = {
    isOrganization: true,
    dataLoading: false,
    sourceId: '123',
    addFieldModalVisible: false,
    unsavedChanges: false,
    exampleDocuments,
    searchResultConfig,
  };

  beforeEach(() => {
    setMockActions({
      initializeDisplaySettings,
      setServerData,
      setColorField,
      handleSelectedTabChanged,
    });
    setMockValues({ ...values });
  });

  it('renders', () => {
    const wrapper = shallow(<DisplaySettings tabId={0} />);

    expect(wrapper.find(UnsavedChangesPrompt)).toHaveLength(1);
    expect(wrapper.find('form')).toHaveLength(1);
  });

  it('returns loading when loading', () => {
    setMockValues({ ...values, dataLoading: true });
    const wrapper = shallow(<DisplaySettings tabId={0} />);

    expect(wrapper.find(Loading)).toHaveLength(1);
  });

  describe('tabbed content', () => {
    const tabs = [
      {
        id: 'search_results',
        name: 'Search Results',
        content: <></>,
      },
      {
        id: 'result_detail',
        name: 'Result Detail',
        content: <></>,
      },
    ];

    it('handles first tab click', () => {
      const wrapper = shallow(<DisplaySettings tabId={0} />);
      const tabsEl = wrapper.find(EuiTabbedContent);
      tabsEl.prop('onTabClick')!(tabs[0]);

      expect(handleSelectedTabChanged).toHaveBeenCalledWith('search_results');
    });

    it('handles second tab click', () => {
      const wrapper = shallow(<DisplaySettings tabId={0} />);
      const tabsEl = wrapper.find(EuiTabbedContent);
      tabsEl.prop('onTabClick')!(tabs[1]);

      expect(handleSelectedTabChanged).toHaveBeenCalledWith('result_detail');
    });
  });

  describe('header action', () => {
    it('renders button when hasDocuments', () => {
      const wrapper = shallow(<DisplaySettings tabId={0} />);
      const button = (
        <EuiButton type="submit" disabled fill>
          Save
        </EuiButton>
      );

      expect(wrapper.find(ViewContentHeader).prop('action')).toStrictEqual(button);
    });

    it('renders null when no documents', () => {
      setMockValues({ ...values, exampleDocuments: [] });
      const wrapper = shallow(<DisplaySettings tabId={0} />);

      expect(wrapper.find(ViewContentHeader).prop('action')).toBeNull();
    });
  });

  it('submits the form', () => {
    const wrapper = shallow(<DisplaySettings tabId={0} />);
    const simulatedEvent = {
      form: 0,
      target: { getAttribute: () => '_self' },
      preventDefault: jest.fn(),
    };

    const form = wrapper.find('form');
    form.simulate('submit', simulatedEvent);
    expect(simulatedEvent.preventDefault).toHaveBeenCalled();
    expect(setServerData).toHaveBeenCalled();
  });

  it('renders FieldEditorModal', () => {
    setMockValues({ ...values, addFieldModalVisible: true });
    const wrapper = shallow(<DisplaySettings tabId={0} />);

    expect(wrapper.find(FieldEditorModal)).toHaveLength(1);
  });
});
