/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { act, waitFor } from '@testing-library/react';
import type { AppContextTestRender } from '../../../../../../common/mock/endpoint';
import { createAppRootMockRenderer } from '../../../../../../common/mock/endpoint';
import {
  getEventFiltersListPath,
  getPolicyDetailsArtifactsListPath,
  getPolicyEventFiltersPath,
} from '../../../../../common/routing';
import { EndpointDocGenerator } from '../../../../../../../common/endpoint/generate_data';

import { PolicyArtifactsLayout } from './policy_artifacts_layout';
import type { ImmutableObject, PolicyData } from '../../../../../../../common/endpoint/types';
import { parsePoliciesAndFilterToKql } from '../../../../../common/utils';
import { eventFiltersListQueryHttpMock } from '../../../../event_filters/test_utils';
import { getFoundExceptionListItemSchemaMock } from '@kbn/lists-plugin/common/schemas/response/found_exception_list_item_schema.mock';
import { POLICY_ARTIFACT_EVENT_FILTERS_LABELS } from '../../tabs/event_filters_translations';
import { EventFiltersApiClient } from '../../../../event_filters/service/api_client';
import { SEARCHABLE_FIELDS as EVENT_FILTERS_SEARCHABLE_FIELDS } from '../../../../event_filters/constants';
import { FormattedMessage } from '@kbn/i18n-react';
import { useUserPrivileges } from '../../../../../../common/components/user_privileges';

jest.mock('../../../../../../common/components/user_privileges');

interface MockedAPIArgs {
  query: { filter: string };
}

let render: (canWriteArtifact?: boolean) => Promise<ReturnType<AppContextTestRender['render']>>;
let mockedContext: AppContextTestRender;
let renderResult: ReturnType<AppContextTestRender['render']>;
let policyItem: ImmutableObject<PolicyData>;
const generator = new EndpointDocGenerator();
let mockedApi: ReturnType<typeof eventFiltersListQueryHttpMock>;
let history: AppContextTestRender['history'];
const useUserPrivilegesMock = useUserPrivileges as jest.Mock;

const getEventFiltersLabels = () => ({
  ...POLICY_ARTIFACT_EVENT_FILTERS_LABELS,
  layoutAboutMessage: (count: number, link: React.ReactElement): React.ReactNode => (
    <FormattedMessage
      id="xpack.securitySolution.endpoint.policy.eventFilters.list.about"
      defaultMessage="There {count, plural, one {is} other {are}} {count} event {count, plural, =1 {filter} other {filters}} associated with this policy. Click here to {link}"
      values={{ count, link }}
    />
  ),
});

describe('Policy artifacts layout', () => {
  const isFilteredByPolicyQuery = (args?: { query: { filter: string } }) =>
    args && args.query.filter === parsePoliciesAndFilterToKql({ policies: [policyItem.id, 'all'] });

  beforeEach(() => {
    mockedContext = createAppRootMockRenderer();
    mockedApi = eventFiltersListQueryHttpMock(mockedContext.coreStart.http);
    mockedApi.responseProvider.eventFiltersList.mockClear();
    policyItem = generator.generatePolicyPackagePolicy();
    ({ history } = mockedContext);

    useUserPrivilegesMock.mockReturnValue({
      endpointPrivileges: {
        canCreateArtifactsByPolicy: true,
      },
    });
    render = async (canWriteArtifact = true) => {
      await act(async () => {
        renderResult = mockedContext.render(
          <PolicyArtifactsLayout
            policyItem={policyItem}
            labels={getEventFiltersLabels()}
            getExceptionsListApiClient={() =>
              EventFiltersApiClient.getInstance(mockedContext.coreStart.http)
            }
            searchableFields={EVENT_FILTERS_SEARCHABLE_FIELDS}
            getArtifactPath={getEventFiltersListPath}
            getPolicyArtifactsPath={getPolicyEventFiltersPath}
            canWriteArtifact={canWriteArtifact}
          />
        );
        await waitFor(mockedApi.responseProvider.eventFiltersList);
      });
      return renderResult;
    };
    history.push(getPolicyEventFiltersPath(policyItem.id));
  });

  it('should render layout with a loader', async () => {
    const component = mockedContext.render(
      <PolicyArtifactsLayout
        policyItem={policyItem}
        labels={getEventFiltersLabels()}
        getExceptionsListApiClient={() =>
          EventFiltersApiClient.getInstance(mockedContext.coreStart.http)
        }
        searchableFields={[...EVENT_FILTERS_SEARCHABLE_FIELDS]}
        getArtifactPath={getEventFiltersListPath}
        getPolicyArtifactsPath={getPolicyEventFiltersPath}
      />
    );
    expect(component.getByTestId('policy-artifacts-loading-spinner')).toBeTruthy();
  });

  it('should render layout with no assigned artifacts data when there are no artifacts', async () => {
    mockedApi.responseProvider.eventFiltersList.mockReturnValue(
      getFoundExceptionListItemSchemaMock(0)
    );

    await render();
    expect(await renderResult.findByTestId('policy-artifacts-empty-unexisting')).not.toBeNull();
  });

  it('should render layout with no assigned artifacts data when there are artifacts', async () => {
    mockedApi.responseProvider.eventFiltersList.mockImplementation((args?: MockedAPIArgs) => {
      if (!isFilteredByPolicyQuery(args)) {
        return getFoundExceptionListItemSchemaMock(1);
      } else {
        return getFoundExceptionListItemSchemaMock(0);
      }
    });

    await render();

    expect(await renderResult.findByTestId('policy-artifacts-empty-unassigned')).not.toBeNull();
  });

  it('should render layout with data', async () => {
    mockedApi.responseProvider.eventFiltersList.mockReturnValue(
      getFoundExceptionListItemSchemaMock(3)
    );
    await render();
    expect(await renderResult.findByTestId('policy-artifacts-header-section')).not.toBeNull();
    expect(await renderResult.findByTestId('policy-artifacts-layout-about')).not.toBeNull();
    expect((await renderResult.findByTestId('policy-artifacts-layout-about')).textContent).toMatch(
      '3 event filters'
    );
  });

  it('should hide `Assign artifacts to policy` on empty state with unassigned policies when downgraded to a gold or below license', async () => {
    useUserPrivilegesMock.mockReturnValue({
      endpointPrivileges: {
        canCreateArtifactsByPolicy: false,
      },
    });
    mockedApi.responseProvider.eventFiltersList.mockReturnValue(
      getFoundExceptionListItemSchemaMock(0)
    );

    await render();
    mockedContext.history.push(getPolicyDetailsArtifactsListPath(policyItem.id));
    expect(renderResult.queryByTestId('artifacts-assign-button')).toBeNull();
  });

  it('should hide the `Assign artifacts to policy` button license is downgraded to gold or below', async () => {
    useUserPrivilegesMock.mockReturnValue({
      endpointPrivileges: {
        canCreateArtifactsByPolicy: false,
      },
    });
    mockedApi.responseProvider.eventFiltersList.mockReturnValue(
      getFoundExceptionListItemSchemaMock(5)
    );

    await render();
    mockedContext.history.push(getPolicyDetailsArtifactsListPath(policyItem.id));

    expect(renderResult.queryByTestId('artifacts-assign-button')).toBeNull();
  });

  it('should hide the `Assign artifacts` flyout when license is downgraded to gold or below', async () => {
    useUserPrivilegesMock.mockReturnValue({
      endpointPrivileges: {
        canCreateArtifactsByPolicy: false,
      },
    });
    mockedApi.responseProvider.eventFiltersList.mockReturnValue(
      getFoundExceptionListItemSchemaMock(2)
    );

    await render();
    mockedContext.history.push(
      `${getPolicyDetailsArtifactsListPath(policyItem.id)}/eventFilters?show=list`
    );

    expect(renderResult.queryByTestId('artifacts-assign-flyout')).toBeNull();
  });

  describe('Without external privileges', () => {
    it('should not display the assign policies button', async () => {
      mockedApi.responseProvider.eventFiltersList.mockReturnValue(
        getFoundExceptionListItemSchemaMock(5)
      );
      await render(false);
      expect(renderResult.queryByTestId('artifacts-assign-button')).toBeNull();
    });
    it('should not display assign and manage artifacts buttons on empty state when there are artifacts', async () => {
      mockedApi.responseProvider.eventFiltersList.mockImplementation((args?: MockedAPIArgs) => {
        if (!isFilteredByPolicyQuery(args)) {
          return getFoundExceptionListItemSchemaMock(1);
        } else {
          return getFoundExceptionListItemSchemaMock(0);
        }
      });
      await render(false);
      expect(await renderResult.findByTestId('policy-artifacts-empty-unassigned')).not.toBeNull();
      expect(renderResult.queryByTestId('unassigned-assign-artifacts-button')).toBeNull();
      expect(renderResult.queryByTestId('unassigned-manage-artifacts-button')).toBeNull();
    });
    it('should not display manage artifacts button on empty state when there are no artifacts', async () => {
      mockedApi.responseProvider.eventFiltersList.mockReturnValue(
        getFoundExceptionListItemSchemaMock(0)
      );
      await render(false);
      expect(await renderResult.findByTestId('policy-artifacts-empty-unexisting')).not.toBeNull();
      expect(renderResult.queryByTestId('unexisting-manage-artifacts-button')).toBeNull();
    });
  });
});
