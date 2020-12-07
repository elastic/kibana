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
import { useGetIncidentTypes } from '../settings/resilient/use_get_incident_types';
import { useGetSeverity } from '../settings/resilient/use_get_severity';
import { useGetIssueTypes } from '../settings/jira/use_get_issue_types';
import { useGetFieldsByIssueType } from '../settings/jira/use_get_fields_by_issue_type';
import { Create } from '.';

jest.mock('../../containers/use_post_case');
jest.mock('../../containers/use_get_tags');
jest.mock('../../containers/configure/use_connectors');
jest.mock('../settings/resilient/use_get_incident_types');
jest.mock('../settings/resilient/use_get_severity');
jest.mock('../settings/jira/use_get_issue_types');
jest.mock('../settings/jira/use_get_fields_by_issue_type');
jest.mock('../settings/jira/use_get_single_issue');
jest.mock('../settings/jira/use_get_issues');

const useConnectorsMock = useConnectors as jest.Mock;
const usePostCaseMock = usePostCase as jest.Mock;
const useGetIncidentTypesMock = useGetIncidentTypes as jest.Mock;
const useGetSeverityMock = useGetSeverity as jest.Mock;
const useGetIssueTypesMock = useGetIssueTypes as jest.Mock;
const useGetFieldsByIssueTypeMock = useGetFieldsByIssueType as jest.Mock;
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

const useGetIncidentTypesResponse = {
  isLoading: false,
  incidentTypes: [
    {
      id: 19,
      name: 'Malware',
    },
    {
      id: 21,
      name: 'Denial of Service',
    },
  ],
};

const useGetSeverityResponse = {
  isLoading: false,
  severity: [
    {
      id: 4,
      name: 'Low',
    },
    {
      id: 5,
      name: 'Medium',
    },
    {
      id: 6,
      name: 'High',
    },
  ],
};

const useGetIssueTypesResponse = {
  isLoading: false,
  issueTypes: [
    {
      id: '10006',
      name: 'Task',
    },
    {
      id: '10007',
      name: 'Bug',
    },
  ],
};

const useGetFieldsByIssueTypeResponse = {
  isLoading: false,
  fields: {
    summary: { allowedValues: [], defaultValue: {} },
    labels: { allowedValues: [], defaultValue: {} },
    description: { allowedValues: [], defaultValue: {} },
    priority: {
      allowedValues: [
        {
          name: 'Medium',
          id: '3',
        },
        {
          name: 'Low',
          id: '2',
        },
      ],
      defaultValue: { name: 'Medium', id: '3' },
    },
  },
};

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
    useGetIncidentTypesMock.mockReturnValue(useGetIncidentTypesResponse);
    useGetSeverityMock.mockReturnValue(useGetSeverityResponse);
    useGetIssueTypesMock.mockReturnValue(useGetIssueTypesResponse);
    useGetFieldsByIssueTypeMock.mockReturnValue(useGetFieldsByIssueTypeResponse);

    jest.spyOn(routeData, 'useLocation').mockReturnValue(mockLocation);
    (useGetTags as jest.Mock).mockImplementation(() => ({
      tags: sampleTags,
      fetchTags,
    }));
  });

  describe('Step 1 - Case Fields', () => {
    it('it renders', async () => {
      const wrapper = mount(
        <TestProviders>
          <Router history={mockHistory}>
            <Create />
          </Router>
        </TestProviders>
      );

      expect(wrapper.find(`[data-test-subj="caseTitle"]`).first().exists()).toBeTruthy();
      expect(wrapper.find(`[data-test-subj="caseDescription"]`).first().exists()).toBeTruthy();
      expect(wrapper.find(`[data-test-subj="caseTags"]`).first().exists()).toBeTruthy();
      expect(wrapper.find(`[data-test-subj="caseConnectors"]`).first().exists()).toBeTruthy();
      expect(wrapper.find(`[data-test-subj="create-case-submit"]`).first().exists()).toBeTruthy();
      expect(wrapper.find(`[data-test-subj="create-case-cancel"]`).first().exists()).toBeTruthy();
      expect(
        wrapper.find(`[data-test-subj="case-creation-form-steps"]`).first().exists()
      ).toBeTruthy();
    });

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
  });

  describe('Step 2 - Connector Fields', () => {
    it(`it should submit a Jira connector`, async () => {
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
      await waitFor(() => {
        expect(wrapper.find(`[data-test-subj="connector-settings-jira"]`).exists()).toBeFalsy();
        wrapper.find('button[data-test-subj="dropdown-connectors"]').simulate('click');
        wrapper.find(`button[data-test-subj="dropdown-connector-jira-1"]`).simulate('click');
        wrapper.update();
      });

      await waitFor(() => {
        wrapper.update();
        expect(wrapper.find(`[data-test-subj="connector-settings-jira"]`).exists()).toBeTruthy();
      });

      act(() => {
        wrapper
          .find('select[data-test-subj="issueTypeSelect"]')
          .first()
          .simulate('change', {
            target: { value: '10007' },
          });
      });

      act(() => {
        wrapper
          .find('select[data-test-subj="prioritySelect"]')
          .first()
          .simulate('change', {
            target: { value: '2' },
          });
      });

      await act(async () => {
        wrapper.find(`[data-test-subj="create-case-submit"]`).first().simulate('click');
      });

      await waitFor(() =>
        expect(postCase).toBeCalledWith({
          ...sampleData,
          connector: {
            id: 'jira-1',
            name: 'Jira',
            type: '.jira',
            fields: { issueType: '10007', parent: null, priority: '2' },
          },
        })
      );
    });

    it(`it should submit a resilient connector`, async () => {
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
      await waitFor(() => {
        expect(
          wrapper.find(`[data-test-subj="connector-settings-resilient"]`).exists()
        ).toBeFalsy();
        wrapper.find('button[data-test-subj="dropdown-connectors"]').simulate('click');
        wrapper.find(`button[data-test-subj="dropdown-connector-resilient-2"]`).simulate('click');
        wrapper.update();
      });

      await waitFor(() => {
        wrapper.update();
        expect(
          wrapper.find(`[data-test-subj="connector-settings-resilient"]`).exists()
        ).toBeTruthy();
      });

      act(() => {
        ((wrapper.find(EuiComboBox).at(1).props() as unknown) as {
          onChange: (a: EuiComboBoxOptionOption[]) => void;
        }).onChange([{ value: '19', label: 'Denial of Service' }]);
      });

      act(() => {
        wrapper
          .find('select[data-test-subj="severitySelect"]')
          .first()
          .simulate('change', {
            target: { value: '4' },
          });
      });

      await act(async () => {
        wrapper.find(`[data-test-subj="create-case-submit"]`).first().simulate('click');
      });

      await waitFor(() =>
        expect(postCase).toBeCalledWith({
          ...sampleData,
          connector: {
            id: 'resilient-2',
            name: 'My Connector 2',
            type: '.resilient',
            fields: { incidentTypes: ['19'], severityCode: '4' },
          },
        })
      );
    });

    it(`it should submit a servicenow connector`, async () => {
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
      await waitFor(() => {
        expect(wrapper.find(`[data-test-subj="connector-settings-sn"]`).exists()).toBeFalsy();
        wrapper.find('button[data-test-subj="dropdown-connectors"]').simulate('click');
        wrapper.find(`button[data-test-subj="dropdown-connector-servicenow-1"]`).simulate('click');
        wrapper.update();
      });

      await waitFor(() => {
        wrapper.update();
        expect(wrapper.find(`[data-test-subj="connector-settings-sn"]`).exists()).toBeTruthy();
      });

      ['severitySelect', 'urgencySelect', 'impactSelect'].forEach((subj) => {
        act(() => {
          wrapper
            .find(`select[data-test-subj="${subj}"]`)
            .first()
            .simulate('change', {
              target: { value: '2' },
            });
        });
      });

      await act(async () => {
        wrapper.find(`[data-test-subj="create-case-submit"]`).first().simulate('click');
      });

      await waitFor(() =>
        expect(postCase).toBeCalledWith({
          ...sampleData,
          connector: {
            id: 'servicenow-1',
            name: 'My Connector',
            type: '.servicenow',
            fields: { impact: '2', severity: '2', urgency: '2' },
          },
        })
      );
    });
  });
});
