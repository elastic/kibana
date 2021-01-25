/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import '../../../../../__mocks__/shallow_useeffect.mock';

import { mockKibanaValues } from '../../../../../__mocks__';

import { setMockValues, setMockActions } from '../../../../../__mocks__';
import { unmountHandler } from '../../../../../__mocks__/shallow_useeffect.mock';

import { shallow } from 'enzyme';

import React from 'react';

import { EuiButton, EuiTabbedContent } from '@elastic/eui';

import { exampleResult } from '../../../../__mocks__/content_sources.mock';

import { Loading } from '../../../../../shared/loading';
import { ViewContentHeader } from '../../../../components/shared/view_content_header';

import { FieldEditorModal } from './field_editor_modal';

import { DisplaySettings } from './display_settings';

describe('DisplaySettings', () => {
  const { navigateToUrl } = mockKibanaValues;
  const { exampleDocuments, searchResultConfig } = exampleResult;
  const initializeDisplaySettings = jest.fn();
  const setServerData = jest.fn();
  const setColorField = jest.fn();

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
    });
    setMockValues({ ...values });
  });

  it('renders', () => {
    const wrapper = shallow(<DisplaySettings tabId={0} />);

    expect(wrapper.find('form')).toHaveLength(1);
  });

  it('returns loading when loading', () => {
    setMockValues({ ...values, dataLoading: true });
    const wrapper = shallow(<DisplaySettings tabId={0} />);

    expect(wrapper.find(Loading)).toHaveLength(1);
  });

  it('handles window.onbeforeunload change', () => {
    setMockValues({ ...values, unsavedChanges: true });
    shallow(<DisplaySettings tabId={0} />);

    unmountHandler();

    expect(window.onbeforeunload).toEqual(null);
  });

  it('handles window.onbeforeunload unmount', () => {
    setMockValues({ ...values, unsavedChanges: true });
    shallow(<DisplaySettings tabId={0} />);

    expect(window.onbeforeunload!({} as any)).toEqual(
      'Your display settings have not been saved. Are you sure you want to leave?'
    );
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

      expect(navigateToUrl).toHaveBeenCalledWith('/sources/123/display_settings/');
    });

    it('handles second tab click', () => {
      const wrapper = shallow(<DisplaySettings tabId={0} />);
      const tabsEl = wrapper.find(EuiTabbedContent);
      tabsEl.prop('onTabClick')!(tabs[1]);

      expect(navigateToUrl).toHaveBeenCalledWith('/sources/123/display_settings/result_detail');
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
