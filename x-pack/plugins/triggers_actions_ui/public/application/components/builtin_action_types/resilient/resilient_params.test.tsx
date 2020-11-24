/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { mountWithIntl } from '@kbn/test/jest';
import ResilientParamsFields from './resilient_params';
import { useGetIncidentTypes } from './use_get_incident_types';
import { useGetSeverity } from './use_get_severity';
import { AlertProvidedActionVariables } from '../../../lib/action_variables';

jest.mock('./use_get_incident_types');
jest.mock('./use_get_severity');
jest.mock('../../../../common/lib/kibana');

const useGetIncidentTypesMock = useGetIncidentTypes as jest.Mock;
const useGetSeverityMock = useGetSeverity as jest.Mock;

const actionParams = {
  subAction: 'pushToService',
  subActionParams: {
    title: 'title',
    description: 'some description',
    comments: [{ commentId: '1', comment: 'comment for resilient' }],
    incidentTypes: [1001],
    severityCode: 6,
    savedObjectId: '123',
    externalId: null,
  },
};
const connector = {
  secrets: {},
  config: {},
  id: 'test',
  actionTypeId: '.test',
  name: 'Test',
  isPreconfigured: false,
};

describe('ResilientParamsFields renders', () => {
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

  beforeEach(() => {
    useGetIncidentTypesMock.mockReturnValue(useGetIncidentTypesResponse);
    useGetSeverityMock.mockReturnValue(useGetSeverityResponse);
  });

  test('all params fields are rendered', () => {
    const wrapper = mountWithIntl(
      <ResilientParamsFields
        actionParams={actionParams}
        errors={{ title: [] }}
        editAction={() => {}}
        index={0}
        messageVariables={[{ name: AlertProvidedActionVariables.alertId, description: '' }]}
        actionConnector={connector}
      />
    );
    expect(wrapper.find('[data-test-subj="incidentTypeComboBox"]').exists()).toBeTruthy();
    expect(wrapper.find('[data-test-subj="severitySelect"]').first().prop('value')).toStrictEqual(
      6
    );
    expect(wrapper.find('[data-test-subj="titleInput"]').length > 0).toBeTruthy();
    expect(wrapper.find('[data-test-subj="descriptionTextArea"]').length > 0).toBeTruthy();
    expect(wrapper.find('[data-test-subj="commentsTextArea"]').length > 0).toBeTruthy();

    // ensure savedObjectIdInput isnt rendered
    expect(wrapper.find('[data-test-subj="savedObjectIdInput"]').length === 0).toBeTruthy();
  });

  test('the savedObjectId fields is rendered if we cant find an alertId in the messageVariables', () => {
    const wrapper = mountWithIntl(
      <ResilientParamsFields
        actionParams={actionParams}
        errors={{ title: [] }}
        editAction={() => {}}
        index={0}
        messageVariables={[]}
        actionConnector={connector}
      />
    );

    expect(wrapper.find('[data-test-subj="savedObjectIdInput"]').length > 0).toBeTruthy();
  });

  test('it shows loading when loading incident types', () => {
    useGetIncidentTypesMock.mockReturnValue({ ...useGetIncidentTypesResponse, isLoading: true });
    const wrapper = mountWithIntl(
      <ResilientParamsFields
        actionParams={actionParams}
        errors={{ title: [] }}
        editAction={() => {}}
        index={0}
        messageVariables={[]}
        actionConnector={connector}
      />
    );

    expect(
      wrapper.find('[data-test-subj="incidentTypeComboBox"]').first().prop('isLoading')
    ).toBeTruthy();
  });

  test('it shows loading when loading severity', () => {
    useGetSeverityMock.mockReturnValue({
      ...useGetSeverityResponse,
      isLoading: true,
    });

    const wrapper = mountWithIntl(
      <ResilientParamsFields
        actionParams={actionParams}
        errors={{ title: [] }}
        editAction={() => {}}
        index={0}
        messageVariables={[]}
        actionConnector={connector}
      />
    );

    expect(
      wrapper.find('[data-test-subj="severitySelect"]').first().prop('isLoading')
    ).toBeTruthy();
  });

  test('it disabled the fields when loading issue types', () => {
    useGetIncidentTypesMock.mockReturnValue({ ...useGetIncidentTypesResponse, isLoading: true });

    const wrapper = mountWithIntl(
      <ResilientParamsFields
        actionParams={actionParams}
        errors={{ title: [] }}
        editAction={() => {}}
        index={0}
        messageVariables={[]}
        actionConnector={connector}
      />
    );

    expect(
      wrapper.find('[data-test-subj="incidentTypeComboBox"]').first().prop('isDisabled')
    ).toBeTruthy();
  });

  test('it disabled the fields when loading severity', () => {
    useGetSeverityMock.mockReturnValue({
      ...useGetSeverityResponse,
      isLoading: true,
    });

    const wrapper = mountWithIntl(
      <ResilientParamsFields
        actionParams={actionParams}
        errors={{ title: [] }}
        editAction={() => {}}
        index={0}
        messageVariables={[]}
        actionConnector={connector}
      />
    );

    expect(wrapper.find('[data-test-subj="severitySelect"]').first().prop('disabled')).toBeTruthy();
  });
});
