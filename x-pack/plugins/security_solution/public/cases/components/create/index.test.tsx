/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { mount } from 'enzyme';
import { Create } from '.';
import { TestProviders } from '../../../common/mock';
import { getFormMock } from '../__mock__/form';
import { Router, routeData, mockHistory, mockLocation } from '../__mock__/router';

import { useInsertTimeline } from '../../../timelines/components/timeline/insert_timeline_popover/use_insert_timeline';
import { usePostCase } from '../../containers/use_post_case';
import { useGetTags } from '../../containers/use_get_tags';

import { useForm } from '../../../../../../../src/plugins/es_ui_shared/static/forms/hook_form_lib/hooks/use_form';
import { useFormData } from '../../../../../../../src/plugins/es_ui_shared/static/forms/hook_form_lib/hooks/use_form_data';

import { waitFor } from '@testing-library/react';
import { useConnectors } from '../../containers/configure/use_connectors';
import { connectorsMock } from '../../containers/configure/mock';
import { ConnectorTypes } from '../../../../../case/common/api/connectors';

jest.mock('@elastic/eui', () => {
  const original = jest.requireActual('@elastic/eui');
  return {
    ...original,
    // eslint-disable-next-line react/display-name
    EuiFieldText: () => <input />,
  };
});
jest.mock('../../../timelines/components/timeline/insert_timeline_popover/use_insert_timeline');
jest.mock('../../containers/use_post_case');

jest.mock(
  '../../../../../../../src/plugins/es_ui_shared/static/forms/hook_form_lib/hooks/use_form'
);

jest.mock(
  '../../../../../../../src/plugins/es_ui_shared/static/forms/hook_form_lib/hooks/use_form_data'
);

jest.mock('../../containers/use_get_tags');
jest.mock('../../containers/configure/use_connectors');
jest.mock(
  '../../../../../../../src/plugins/es_ui_shared/static/forms/hook_form_lib/components/form_data_provider',
  () => ({
    FormDataProvider: ({ children }: { children: ({ tags }: { tags: string[] }) => void }) =>
      children({ tags: ['rad', 'dude'] }),
  })
);
const useConnectorsMock = useConnectors as jest.Mock;
const useFormMock = useForm as jest.Mock;
const useFormDataMock = useFormData as jest.Mock;

const useInsertTimelineMock = useInsertTimeline as jest.Mock;
const usePostCaseMock = usePostCase as jest.Mock;

const postCase = jest.fn();
const handleCursorChange = jest.fn();
const handleOnTimelineChange = jest.fn();

const defaultInsertTimeline = {
  cursorPosition: {
    start: 0,
    end: 0,
  },
  handleCursorChange,
  handleOnTimelineChange,
};

const sampleTags = ['coke', 'pepsi'];
const sampleData = {
  description: 'what a great description',
  tags: sampleTags,
  title: 'what a cool title',
  connector: {
    fields: null,
    id: 'none',
    name: 'none',
    type: ConnectorTypes.none,
  },
};
const defaultPostCase = {
  isLoading: false,
  isError: false,
  caseData: null,
  postCase,
};
const sampleConnectorData = { loading: false, connectors: [] };
describe('Create case', () => {
  const fetchTags = jest.fn();
  const formHookMock = getFormMock(sampleData);
  beforeEach(() => {
    jest.resetAllMocks();
    useInsertTimelineMock.mockImplementation(() => defaultInsertTimeline);
    usePostCaseMock.mockImplementation(() => defaultPostCase);
    useFormMock.mockImplementation(() => ({ form: formHookMock }));
    useFormDataMock.mockImplementation(() => [
      {
        description: sampleData.description,
      },
    ]);
    useConnectorsMock.mockReturnValue(sampleConnectorData);
    jest.spyOn(routeData, 'useLocation').mockReturnValue(mockLocation);
    (useGetTags as jest.Mock).mockImplementation(() => ({
      tags: sampleTags,
      fetchTags,
    }));
  });

  describe('Step 1 - Case Fields', () => {
    it('should post case on submit click', async () => {
      const wrapper = mount(
        <TestProviders>
          <Router history={mockHistory}>
            <Create />
          </Router>
        </TestProviders>
      );
      wrapper.find(`[data-test-subj="create-case-submit"]`).first().simulate('click');
      await waitFor(() => expect(postCase).toBeCalledWith(sampleData));
    });

    it('should redirect to all cases on cancel click', async () => {
      const wrapper = mount(
        <TestProviders>
          <Router history={mockHistory}>
            <Create />
          </Router>
        </TestProviders>
      );
      wrapper.find(`[data-test-subj="create-case-cancel"]`).first().simulate('click');
      await waitFor(() => expect(mockHistory.push).toHaveBeenCalledWith('/'));
    });
    it('should redirect to new case when caseData is there', async () => {
      const sampleId = '777777';
      usePostCaseMock.mockImplementation(() => ({
        ...defaultPostCase,
        caseData: { id: sampleId },
      }));
      mount(
        <TestProviders>
          <Router history={mockHistory}>
            <Create />
          </Router>
        </TestProviders>
      );
      await waitFor(() => expect(mockHistory.push).toHaveBeenNthCalledWith(1, '/777777'));
    });

    it('should render spinner when loading', async () => {
      usePostCaseMock.mockImplementation(() => ({ ...defaultPostCase, isLoading: true }));
      const wrapper = mount(
        <TestProviders>
          <Router history={mockHistory}>
            <Create />
          </Router>
        </TestProviders>
      );
      await waitFor(() =>
        expect(wrapper.find(`[data-test-subj="create-case-loading-spinner"]`).exists()).toBeTruthy()
      );
    });
    it('Tag options render with new tags added', async () => {
      const wrapper = mount(
        <TestProviders>
          <Router history={mockHistory}>
            <Create />
          </Router>
        </TestProviders>
      );
      await waitFor(() =>
        expect(
          wrapper
            .find(`[data-test-subj="caseTags"] [data-test-subj="input"]`)
            .first()
            .prop('options')
        ).toEqual([{ label: 'coke' }, { label: 'pepsi' }, { label: 'rad' }, { label: 'dude' }])
      );
    });
  });

  // FAILED ES PROMOTION: https://github.com/elastic/kibana/issues/84145
  describe.skip('Step 2 - Connector Fields', () => {
    const connectorTypes = [
      {
        label: 'Jira',
        testId: 'jira-1',
        dataTestSubj: 'connector-settings-jira',
      },
      {
        label: 'Resilient',
        testId: 'resilient-2',
        dataTestSubj: 'connector-settings-resilient',
      },
      {
        label: 'ServiceNow',
        testId: 'servicenow-1',
        dataTestSubj: 'connector-settings-sn',
      },
    ];
    connectorTypes.forEach(({ label, testId, dataTestSubj }) => {
      it(`should change from none to ${label} connector fields`, async () => {
        useConnectorsMock.mockReturnValue({
          ...sampleConnectorData,
          connectors: connectorsMock,
        });

        const wrapper = mount(
          <TestProviders>
            <Router history={mockHistory}>
              <Create />
            </Router>
          </TestProviders>
        );

        await waitFor(() => {
          expect(wrapper.find(`[data-test-subj="${dataTestSubj}"]`).exists()).toBeFalsy();
          wrapper.find('button[data-test-subj="dropdown-connectors"]').simulate('click');
          wrapper.find(`button[data-test-subj="dropdown-connector-${testId}"]`).simulate('click');
          wrapper.update();
        });

        await waitFor(() => {
          wrapper.update();
          expect(wrapper.find(`[data-test-subj="${dataTestSubj}"]`).exists()).toBeTruthy();
        });
      });
    });
  });
});
