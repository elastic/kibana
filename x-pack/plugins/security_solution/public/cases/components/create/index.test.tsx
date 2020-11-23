/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { mount, ReactWrapper } from 'enzyme';
import { act, waitFor } from '@testing-library/react';
import { EuiComboBox, EuiComboBoxOptionOption } from '@elastic/eui';
import { TestProviders } from '../../../common/mock';

import { usePostCase } from '../../containers/use_post_case';
import { useGetTags } from '../../containers/use_get_tags';
import { useConnectors } from '../../containers/configure/use_connectors';
import { connectorsMock } from '../../containers/configure/mock';
import { ConnectorTypes } from '../../../../../case/common/api/connectors';
import { Router, routeData, mockHistory, mockLocation } from '../__mock__/router';
import { Create } from '.';

jest.mock('../../containers/use_post_case');
jest.mock('../../containers/use_get_tags');
jest.mock('../../containers/configure/use_connectors');
const useConnectorsMock = useConnectors as jest.Mock;
const usePostCaseMock = usePostCase as jest.Mock;

const postCase = jest.fn();

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

const fillForm = async (wrapper: ReactWrapper) => {
  await act(async () => {
    wrapper
      .find(`[data-test-subj="caseTitle"] input`)
      .first()
      .simulate('change', { target: { value: sampleData.title } });
  });

  await act(async () => {
    wrapper
      .find(`[data-test-subj="caseDescription"] textarea`)
      .first()
      .simulate('change', { target: { value: sampleData.description } });
  });

  await waitFor(() => {
    ((wrapper.find(EuiComboBox).props() as unknown) as {
      onChange: (a: EuiComboBoxOptionOption[]) => void;
    }).onChange(sampleTags.map((tag) => ({ label: tag })));
  });
};

describe('Create case', () => {
  const fetchTags = jest.fn();
  beforeEach(() => {
    jest.resetAllMocks();
    usePostCaseMock.mockImplementation(() => defaultPostCase);
    useConnectorsMock.mockReturnValue(sampleConnectorData);
    jest.spyOn(routeData, 'useLocation').mockReturnValue(mockLocation);
    (useGetTags as jest.Mock).mockImplementation(() => ({
      tags: sampleTags,
      fetchTags,
    }));
  });

  describe('Step 1 - Case Fields', () => {
    it('should post case on submit click', async () => {
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

      await fillForm(wrapper);
      wrapper.update();
      await act(async () => {
        wrapper.find(`[data-test-subj="create-case-submit"]`).first().simulate('click');
      });
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
      const sampleId = 'case-id';
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
      await waitFor(() => expect(mockHistory.push).toHaveBeenNthCalledWith(1, '/case-id'));
    });

    it('should render spinner when loading', async () => {
      const wrapper = mount(
        <TestProviders>
          <Router history={mockHistory}>
            <Create />
          </Router>
        </TestProviders>
      );

      await fillForm(wrapper);
      await act(async () => {
        await wrapper.find(`[data-test-subj="create-case-submit"]`).first().simulate('click');
        wrapper.update();
        expect(
          wrapper.find(`[data-test-subj="create-case-loading-spinner"]`).exists()
        ).toBeTruthy();
      });
    });

    it('Tag options render with new tags added', async () => {
      const wrapper = mount(
        <TestProviders>
          <Router history={mockHistory}>
            <Create />
          </Router>
        </TestProviders>
      );

      await waitFor(() => {
        ((wrapper.find(EuiComboBox).props() as unknown) as {
          onChange: (a: EuiComboBoxOptionOption[]) => void;
        }).onChange([...sampleTags, 'rad', 'dude'].map((tag) => ({ label: tag })));
      });

      wrapper.update();
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

  describe('Step 2 - Connector Fields', () => {
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
