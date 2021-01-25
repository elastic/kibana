/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { mount } from 'enzyme';
import moment from 'moment-timezone';
import { waitFor } from '@testing-library/react';
import '../../../common/mock/match_media';
import { TestProviders } from '../../../common/mock';
import { casesStatus, useGetCasesMockState } from '../../containers/mock';
import * as i18n from './translations';

import { CaseStatuses } from '../../../../../case/common/api';
import { useKibana } from '../../../common/lib/kibana';
import { getEmptyTagValue } from '../../../common/components/empty_value';
import { useDeleteCases } from '../../containers/use_delete_cases';
import { useGetCases } from '../../containers/use_get_cases';
import { useGetCasesStatus } from '../../containers/use_get_cases_status';
import { useUpdateCases } from '../../containers/use_bulk_update_case';
import { getCasesColumns } from './columns';
import { AllCases } from '.';

jest.mock('../../containers/use_bulk_update_case');
jest.mock('../../containers/use_delete_cases');
jest.mock('../../containers/use_get_cases');
jest.mock('../../containers/use_get_cases_status');

const useKibanaMock = useKibana as jest.Mocked<typeof useKibana>;
const useDeleteCasesMock = useDeleteCases as jest.Mock;
const useGetCasesMock = useGetCases as jest.Mock;
const useGetCasesStatusMock = useGetCasesStatus as jest.Mock;
const useUpdateCasesMock = useUpdateCases as jest.Mock;

jest.mock('../../../common/components/link_to');

jest.mock('../../../common/lib/kibana');

describe('AllCases', () => {
  const dispatchResetIsDeleted = jest.fn();
  const dispatchResetIsUpdated = jest.fn();
  const dispatchUpdateCaseProperty = jest.fn();
  const handleOnDeleteConfirm = jest.fn();
  const handleToggleModal = jest.fn();
  const refetchCases = jest.fn();
  const setFilters = jest.fn();
  const setQueryParams = jest.fn();
  const setSelectedCases = jest.fn();
  const updateBulkStatus = jest.fn();
  const fetchCasesStatus = jest.fn();
  const onRowClick = jest.fn();
  const emptyTag = getEmptyTagValue().props.children;

  const defaultGetCases = {
    ...useGetCasesMockState,
    dispatchUpdateCaseProperty,
    refetchCases,
    setFilters,
    setQueryParams,
    setSelectedCases,
  };

  const defaultDeleteCases = {
    dispatchResetIsDeleted,
    handleOnDeleteConfirm,
    handleToggleModal,
    isDeleted: false,
    isDisplayConfirmDeleteModal: false,
    isLoading: false,
  };

  const defaultCasesStatus = {
    ...casesStatus,
    fetchCasesStatus,
    isError: false,
    isLoading: false,
  };

  const defaultUpdateCases = {
    isUpdated: false,
    isLoading: false,
    isError: false,
    dispatchResetIsUpdated,
    updateBulkStatus,
  };

  let navigateToApp: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    navigateToApp = jest.fn();
    useKibanaMock().services.application.navigateToApp = navigateToApp;
    useUpdateCasesMock.mockReturnValue(defaultUpdateCases);
    useGetCasesMock.mockReturnValue(defaultGetCases);
    useDeleteCasesMock.mockReturnValue(defaultDeleteCases);
    useGetCasesStatusMock.mockReturnValue(defaultCasesStatus);
    moment.tz.setDefault('UTC');
  });

  it('should render AllCases', async () => {
    const wrapper = mount(
      <TestProviders>
        <AllCases userCanCrud={true} />
      </TestProviders>
    );

    await waitFor(() => {
      expect(wrapper.find(`a[data-test-subj="case-details-link"]`).first().prop('href')).toEqual(
        `/${useGetCasesMockState.data.cases[0].id}`
      );
      expect(wrapper.find(`a[data-test-subj="case-details-link"]`).first().text()).toEqual(
        useGetCasesMockState.data.cases[0].title
      );
      expect(
        wrapper.find(`span[data-test-subj="case-table-column-tags-0"]`).first().prop('title')
      ).toEqual(useGetCasesMockState.data.cases[0].tags[0]);
      expect(wrapper.find(`[data-test-subj="case-table-column-createdBy"]`).first().text()).toEqual(
        useGetCasesMockState.data.cases[0].createdBy.fullName
      );
      expect(
        wrapper
          .find(`[data-test-subj="case-table-column-createdAt"]`)
          .first()
          .childAt(0)
          .prop('value')
      ).toBe(useGetCasesMockState.data.cases[0].createdAt);
      expect(wrapper.find(`[data-test-subj="case-table-case-count"]`).first().text()).toEqual(
        'Showing 10 cases'
      );
    });
  });

  it('should render the stats', async () => {
    const wrapper = mount(
      <TestProviders>
        <AllCases userCanCrud={true} />
      </TestProviders>
    );

    await waitFor(() => {
      expect(wrapper.find('[data-test-subj="openStatsHeader"]').exists()).toBeTruthy();
      expect(
        wrapper
          .find('[data-test-subj="openStatsHeader"] .euiDescriptionList__description')
          .first()
          .text()
      ).toBe('20');

      expect(wrapper.find('[data-test-subj="inProgressStatsHeader"]').exists()).toBeTruthy();
      expect(
        wrapper
          .find('[data-test-subj="inProgressStatsHeader"] .euiDescriptionList__description')
          .first()
          .text()
      ).toBe('40');

      expect(wrapper.find('[data-test-subj="closedStatsHeader"]').exists()).toBeTruthy();
      expect(
        wrapper
          .find('[data-test-subj="closedStatsHeader"] .euiDescriptionList__description')
          .first()
          .text()
      ).toBe('130');
    });
  });

  it('should render the loading spinner when loading stats', async () => {
    useGetCasesStatusMock.mockReturnValue({ ...defaultCasesStatus, isLoading: true });

    const wrapper = mount(
      <TestProviders>
        <AllCases userCanCrud={true} />
      </TestProviders>
    );

    await waitFor(() => {
      expect(
        wrapper.find('[data-test-subj="openStatsHeader-loading-spinner"]').exists()
      ).toBeTruthy();
      expect(
        wrapper.find('[data-test-subj="inProgressStatsHeader-loading-spinner"]').exists()
      ).toBeTruthy();
      expect(
        wrapper.find('[data-test-subj="closedStatsHeader-loading-spinner"]').exists()
      ).toBeTruthy();
    });
  });

  it('should render empty fields', async () => {
    useGetCasesMock.mockReturnValue({
      ...defaultGetCases,
      data: {
        ...defaultGetCases.data,
        cases: [
          {
            ...defaultGetCases.data.cases[0],
            id: null,
            createdAt: null,
            createdBy: null,
            tags: null,
            title: null,
            totalComment: null,
          },
        ],
      },
    });
    const wrapper = mount(
      <TestProviders>
        <AllCases userCanCrud={true} />
      </TestProviders>
    );
    const checkIt = (columnName: string, key: number) => {
      const column = wrapper.find('[data-test-subj="cases-table"] tbody .euiTableRowCell').at(key);
      if (columnName === i18n.ACTIONS) {
        return;
      }
      expect(column.find('.euiTableRowCell--hideForDesktop').text()).toEqual(columnName);
      expect(column.find('span').text()).toEqual(emptyTag);
    };
    await waitFor(() => {
      getCasesColumns([], CaseStatuses.open, false).map(
        (i, key) => i.name != null && checkIt(`${i.name}`, key)
      );
    });
  });

  it('should not render case link or actions on modal=true', async () => {
    const wrapper = mount(
      <TestProviders>
        <AllCases userCanCrud={true} isModal={true} />
      </TestProviders>
    );
    await waitFor(() => {
      const checkIt = (columnName: string) => {
        expect(columnName).not.toEqual(i18n.ACTIONS);
      };
      getCasesColumns([], CaseStatuses.open, true).map(
        (i, key) => i.name != null && checkIt(`${i.name}`)
      );
      expect(wrapper.find(`a[data-test-subj="case-details-link"]`).exists()).toBeFalsy();
    });
  });

  it('should tableHeaderSortButton AllCases', async () => {
    const wrapper = mount(
      <TestProviders>
        <AllCases userCanCrud={true} />
      </TestProviders>
    );
    await waitFor(() => {
      wrapper.find('[data-test-subj="tableHeaderSortButton"]').first().simulate('click');
      expect(setQueryParams).toBeCalledWith({
        page: 1,
        perPage: 5,
        sortField: 'createdAt',
        sortOrder: 'asc',
      });
    });
  });

  it('closes case when row action icon clicked', async () => {
    const wrapper = mount(
      <TestProviders>
        <AllCases userCanCrud={true} />
      </TestProviders>
    );
    await waitFor(() => {
      wrapper.find('[data-test-subj="action-close"]').first().simulate('click');
      const firstCase = useGetCasesMockState.data.cases[0];
      expect(dispatchUpdateCaseProperty).toBeCalledWith({
        caseId: firstCase.id,
        updateKey: 'status',
        updateValue: CaseStatuses.closed,
        refetchCasesStatus: fetchCasesStatus,
        version: firstCase.version,
      });
    });
  });

  it('opens case when row action icon clicked', async () => {
    useGetCasesMock.mockReturnValue({
      ...defaultGetCases,
      filterOptions: { ...defaultGetCases.filterOptions, status: CaseStatuses.closed },
    });

    const wrapper = mount(
      <TestProviders>
        <AllCases userCanCrud={true} />
      </TestProviders>
    );
    await waitFor(() => {
      wrapper.find('[data-test-subj="action-open"]').first().simulate('click');
      const firstCase = useGetCasesMockState.data.cases[0];
      expect(dispatchUpdateCaseProperty).toBeCalledWith({
        caseId: firstCase.id,
        updateKey: 'status',
        updateValue: CaseStatuses.open,
        refetchCasesStatus: fetchCasesStatus,
        version: firstCase.version,
      });
    });
  });

  it('Bulk delete', async () => {
    useGetCasesMock.mockReturnValue({
      ...defaultGetCases,
      selectedCases: useGetCasesMockState.data.cases,
    });

    useDeleteCasesMock
      .mockReturnValueOnce({
        ...defaultDeleteCases,
        isDisplayConfirmDeleteModal: false,
      })
      .mockReturnValue({
        ...defaultDeleteCases,
        isDisplayConfirmDeleteModal: true,
      });

    const wrapper = mount(
      <TestProviders>
        <AllCases userCanCrud={true} />
      </TestProviders>
    );
    await waitFor(() => {
      wrapper.find('[data-test-subj="case-table-bulk-actions"] button').first().simulate('click');
      wrapper.find('[data-test-subj="cases-bulk-delete-button"]').first().simulate('click');
      expect(handleToggleModal).toBeCalled();

      wrapper
        .find(
          '[data-test-subj="confirm-delete-case-modal"] [data-test-subj="confirmModalConfirmButton"]'
        )
        .last()
        .simulate('click');
      expect(handleOnDeleteConfirm.mock.calls[0][0]).toStrictEqual(
        useGetCasesMockState.data.cases.map(({ id }) => ({ id }))
      );
    });
  });

  it('Bulk close status update', async () => {
    useGetCasesMock.mockReturnValue({
      ...defaultGetCases,
      selectedCases: useGetCasesMockState.data.cases,
    });

    const wrapper = mount(
      <TestProviders>
        <AllCases userCanCrud={true} />
      </TestProviders>
    );
    await waitFor(() => {
      wrapper.find('[data-test-subj="case-table-bulk-actions"] button').first().simulate('click');
      wrapper.find('[data-test-subj="cases-bulk-close-button"]').first().simulate('click');
      expect(updateBulkStatus).toBeCalledWith(useGetCasesMockState.data.cases, CaseStatuses.closed);
    });
  });

  it('Bulk open status update', async () => {
    useGetCasesMock.mockReturnValue({
      ...defaultGetCases,
      selectedCases: useGetCasesMockState.data.cases,
      filterOptions: {
        ...defaultGetCases.filterOptions,
        status: CaseStatuses.closed,
      },
    });

    const wrapper = mount(
      <TestProviders>
        <AllCases userCanCrud={true} />
      </TestProviders>
    );
    await waitFor(() => {
      wrapper.find('[data-test-subj="case-table-bulk-actions"] button').first().simulate('click');
      wrapper.find('[data-test-subj="cases-bulk-open-button"]').first().simulate('click');
      expect(updateBulkStatus).toBeCalledWith(useGetCasesMockState.data.cases, CaseStatuses.open);
    });
  });

  it('isDeleted is true, refetch', async () => {
    useDeleteCasesMock.mockReturnValue({
      ...defaultDeleteCases,
      isDeleted: true,
    });

    mount(
      <TestProviders>
        <AllCases userCanCrud={true} />
      </TestProviders>
    );
    await waitFor(() => {
      expect(refetchCases).toBeCalled();
      expect(fetchCasesStatus).toBeCalled();
      expect(dispatchResetIsDeleted).toBeCalled();
    });
  });
  it('isUpdated is true, refetch', async () => {
    useUpdateCasesMock.mockReturnValue({
      ...defaultUpdateCases,
      isUpdated: true,
    });

    mount(
      <TestProviders>
        <AllCases userCanCrud={true} />
      </TestProviders>
    );
    await waitFor(() => {
      expect(refetchCases).toBeCalled();
      expect(fetchCasesStatus).toBeCalled();
      expect(dispatchResetIsUpdated).toBeCalled();
    });
  });

  it('should not render header when modal=true', async () => {
    const wrapper = mount(
      <TestProviders>
        <AllCases userCanCrud={true} isModal={true} />
      </TestProviders>
    );
    await waitFor(() => {
      expect(wrapper.find('[data-test-subj="all-cases-header"]').exists()).toBe(false);
    });
  });

  it('should not render table utility bar when modal=true', async () => {
    const wrapper = mount(
      <TestProviders>
        <AllCases userCanCrud={true} isModal={true} />
      </TestProviders>
    );
    await waitFor(() => {
      expect(wrapper.find('[data-test-subj="case-table-utility-bar-actions"]').exists()).toBe(
        false
      );
    });
  });

  it('case table should not be selectable when modal=true', async () => {
    const wrapper = mount(
      <TestProviders>
        <AllCases userCanCrud={true} isModal={true} />
      </TestProviders>
    );
    await waitFor(() => {
      expect(wrapper.find('[data-test-subj="cases-table"]').first().prop('isSelectable')).toBe(
        false
      );
    });
  });

  it('should call onRowClick with no cases and modal=true', async () => {
    useGetCasesMock.mockReturnValue({
      ...defaultGetCases,
      data: {
        ...defaultGetCases.data,
        total: 0,
        cases: [],
      },
    });

    const wrapper = mount(
      <TestProviders>
        <AllCases userCanCrud={true} isModal={true} onRowClick={onRowClick} />
      </TestProviders>
    );
    await waitFor(() => {
      wrapper.find('[data-test-subj="cases-table-add-case"]').first().simulate('click');
      expect(onRowClick).toHaveBeenCalled();
    });
  });

  it('should call navigateToApp with no cases and modal=false', async () => {
    useGetCasesMock.mockReturnValue({
      ...defaultGetCases,
      data: {
        ...defaultGetCases.data,
        total: 0,
        cases: [],
      },
    });

    const wrapper = mount(
      <TestProviders>
        <AllCases userCanCrud={true} isModal={false} />
      </TestProviders>
    );
    await waitFor(() => {
      wrapper.find('[data-test-subj="cases-table-add-case"]').first().simulate('click');
      expect(navigateToApp).toHaveBeenCalledWith('securitySolution:case', { path: '/create' });
    });
  });

  it('should call onRowClick when clicking a case with modal=true', async () => {
    const wrapper = mount(
      <TestProviders>
        <AllCases userCanCrud={true} isModal={true} onRowClick={onRowClick} />
      </TestProviders>
    );
    await waitFor(() => {
      wrapper.find('[data-test-subj="cases-table-row-1"]').first().simulate('click');
      expect(onRowClick).toHaveBeenCalledWith({
        closedAt: null,
        closedBy: null,
        comments: [],
        connector: { fields: null, id: '123', name: 'My Connector', type: '.none' },
        createdAt: '2020-02-19T23:06:33.798Z',
        createdBy: {
          email: 'leslie.knope@elastic.co',
          fullName: 'Leslie Knope',
          username: 'lknope',
        },
        description: 'Security banana Issue',
        externalService: {
          connectorId: '123',
          connectorName: 'connector name',
          externalId: 'external_id',
          externalTitle: 'external title',
          externalUrl: 'basicPush.com',
          pushedAt: '2020-02-20T15:02:57.995Z',
          pushedBy: {
            email: 'leslie.knope@elastic.co',
            fullName: 'Leslie Knope',
            username: 'lknope',
          },
        },
        id: '1',
        status: 'open',
        tags: ['coke', 'pepsi'],
        title: 'Another horrible breach!!',
        totalComment: 0,
        updatedAt: '2020-02-20T15:02:57.995Z',
        updatedBy: {
          email: 'leslie.knope@elastic.co',
          fullName: 'Leslie Knope',
          username: 'lknope',
        },
        version: 'WzQ3LDFd',
        settings: {
          syncAlerts: true,
        },
      });
    });
  });

  it('should NOT call onRowClick when clicking a case with modal=true', async () => {
    const wrapper = mount(
      <TestProviders>
        <AllCases userCanCrud={true} isModal={false} />
      </TestProviders>
    );
    await waitFor(() => {
      wrapper.find('[data-test-subj="cases-table-row-1"]').first().simulate('click');
      expect(onRowClick).not.toHaveBeenCalled();
    });
  });

  it('should change the status to closed', async () => {
    const wrapper = mount(
      <TestProviders>
        <AllCases userCanCrud={true} isModal={false} />
      </TestProviders>
    );

    await waitFor(() => {
      wrapper.find('button[data-test-subj="case-status-filter"]').simulate('click');
      wrapper.find('button[data-test-subj="case-status-filter-closed"]').simulate('click');
      expect(setQueryParams).toBeCalledWith({
        sortField: 'closedAt',
      });
    });
  });

  it('should change the status to in-progress', async () => {
    const wrapper = mount(
      <TestProviders>
        <AllCases userCanCrud={true} isModal={false} />
      </TestProviders>
    );

    await waitFor(() => {
      wrapper.find('button[data-test-subj="case-status-filter"]').simulate('click');
      wrapper.find('button[data-test-subj="case-status-filter-in-progress"]').simulate('click');
      expect(setQueryParams).toBeCalledWith({
        sortField: 'updatedAt',
      });
    });
  });

  it('should change the status to open', async () => {
    const wrapper = mount(
      <TestProviders>
        <AllCases userCanCrud={true} isModal={false} />
      </TestProviders>
    );

    await waitFor(() => {
      wrapper.find('button[data-test-subj="case-status-filter"]').simulate('click');
      wrapper.find('button[data-test-subj="case-status-filter-open"]').simulate('click');
      expect(setQueryParams).toBeCalledWith({
        sortField: 'createdAt',
      });
    });
  });

  it('should show the correct count on stats', async () => {
    const wrapper = mount(
      <TestProviders>
        <AllCases userCanCrud={true} isModal={false} />
      </TestProviders>
    );

    await waitFor(() => {
      wrapper.find('button[data-test-subj="case-status-filter"]').simulate('click');
      expect(wrapper.find('button[data-test-subj="case-status-filter-open"]').text()).toBe(
        'Open (20)'
      );
      expect(wrapper.find('button[data-test-subj="case-status-filter-in-progress"]').text()).toBe(
        'In progress (40)'
      );
      expect(wrapper.find('button[data-test-subj="case-status-filter-closed"]').text()).toBe(
        'Closed (130)'
      );
    });
  });
});
