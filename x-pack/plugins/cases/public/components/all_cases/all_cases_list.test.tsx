/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { mount } from 'enzyme';
import moment from 'moment-timezone';
import { act, render, waitFor, screen } from '@testing-library/react';
import { renderHook } from '@testing-library/react-hooks';
import userEvent from '@testing-library/user-event';

import '../../common/mock/match_media';
import { TestProviders } from '../../common/mock';
import { casesStatus, useGetCasesMockState, mockCase, connectorsMock } from '../../containers/mock';

import { StatusAll } from '../../../common/ui/types';
import { CaseStatuses, CommentType } from '../../../common/api';
import { SECURITY_SOLUTION_OWNER } from '../../../common/constants';
import { getEmptyTagValue } from '../empty_value';
import { useDeleteCases } from '../../containers/use_delete_cases';
import { useGetCases } from '../../containers/use_get_cases';
import { useGetCasesStatus } from '../../containers/use_get_cases_status';
import { useUpdateCases } from '../../containers/use_bulk_update_case';
import { useGetActionLicense } from '../../containers/use_get_action_license';
import { useConnectors } from '../../containers/configure/use_connectors';
import { useKibana } from '../../common/lib/kibana';
import { AllCasesList } from './all_cases_list';
import { CasesColumns, GetCasesColumn, useCasesColumns } from './columns';
import { triggersActionsUiMock } from '../../../../triggers_actions_ui/public/mocks';
import { registerConnectorsToMockActionRegistry } from '../../common/mock/register_connectors';
import { createStartServicesMock } from '../../common/lib/kibana/kibana_react.mock';
import { waitForComponentToUpdate } from '../../common/test_utils';
import { usePostComment } from '../../containers/use_post_comment';
import { useGetTags } from '../../containers/use_get_tags';
import { useGetReporters } from '../../containers/use_get_reporters';

jest.mock('../../containers/use_post_comment');
jest.mock('../../containers/use_bulk_update_case');
jest.mock('../../containers/use_delete_cases');
jest.mock('../../containers/use_get_cases');
jest.mock('../../containers/use_get_cases_status');
jest.mock('../../containers/use_get_action_license');
jest.mock('../../containers/use_get_tags');
jest.mock('../../containers/use_get_reporters');
jest.mock('../../containers/configure/use_connectors');
jest.mock('../../common/lib/kibana');
jest.mock('../../common/navigation/hooks');
jest.mock('../app/use_available_owners', () => ({
  useAvailableCasesOwners: () => ['securitySolution', 'observability'],
}));

const useDeleteCasesMock = useDeleteCases as jest.Mock;
const useGetCasesMock = useGetCases as jest.Mock;
const useGetCasesStatusMock = useGetCasesStatus as jest.Mock;
const useUpdateCasesMock = useUpdateCases as jest.Mock;
const useGetActionLicenseMock = useGetActionLicense as jest.Mock;
const useGetTagsMock = useGetTags as jest.Mock;
const useGetReportersMock = useGetReporters as jest.Mock;
const useKibanaMock = useKibana as jest.MockedFunction<typeof useKibana>;
const useConnectorsMock = useConnectors as jest.Mock;
const usePostCommentMock = usePostComment as jest.Mock;

const mockTriggersActionsUiService = triggersActionsUiMock.createStart();

const mockKibana = () => {
  useKibanaMock.mockReturnValue({
    services: {
      ...createStartServicesMock(),
      triggersActionsUi: mockTriggersActionsUiService,
    },
  } as unknown as ReturnType<typeof useKibana>);
};

describe('AllCasesListGeneric', () => {
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
  usePostCommentMock.mockReturnValue({ status: { isLoading: false }, postComment: jest.fn() });

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

  const defaultActionLicense = {
    actionLicense: null,
    isLoading: false,
    isError: false,
  };

  const defaultColumnArgs = {
    caseDetailsNavigation: {
      href: jest.fn(),
      onClick: jest.fn(),
    },
    dispatchUpdateCaseProperty: jest.fn,
    filterStatus: CaseStatuses.open,
    handleIsLoading: jest.fn(),
    isLoadingCases: [],
    isSelectorView: false,
    userCanCrud: true,
  };

  beforeAll(() => {
    mockKibana();
    const actionTypeRegistry = useKibanaMock().services.triggersActionsUi.actionTypeRegistry;
    registerConnectorsToMockActionRegistry(actionTypeRegistry, connectorsMock);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    useUpdateCasesMock.mockReturnValue(defaultUpdateCases);
    useGetCasesMock.mockReturnValue(defaultGetCases);
    useDeleteCasesMock.mockReturnValue(defaultDeleteCases);
    useGetCasesStatusMock.mockReturnValue(defaultCasesStatus);
    useGetActionLicenseMock.mockReturnValue(defaultActionLicense);
    useGetTagsMock.mockReturnValue({ tags: ['coke', 'pepsi'], fetchTags: jest.fn() });
    useGetReportersMock.mockReturnValue({
      reporters: ['casetester'],
      respReporters: [{ username: 'casetester' }],
      isLoading: true,
      isError: false,
      fetchReporters: jest.fn(),
    });
    useConnectorsMock.mockImplementation(() => ({ connectors: connectorsMock, loading: false }));
    useConnectorsMock.mockImplementation(() => ({ connectors: connectorsMock, loading: false }));
    mockKibana();
    moment.tz.setDefault('UTC');
  });

  it('should render AllCasesList', async () => {
    useGetCasesMock.mockReturnValue({
      ...defaultGetCases,
      filterOptions: { ...defaultGetCases.filterOptions, status: CaseStatuses.open },
    });

    const wrapper = mount(
      <TestProviders>
        <AllCasesList />
      </TestProviders>
    );

    await waitFor(() => {
      expect(wrapper.find(`a[data-test-subj="case-details-link"]`).first().prop('href')).toEqual(
        `/app/security/cases/test`
      );
      expect(wrapper.find(`a[data-test-subj="case-details-link"]`).first().text()).toEqual(
        useGetCasesMockState.data.cases[0].title
      );
      expect(
        wrapper.find(`span[data-test-subj="case-table-column-tags-0"]`).first().prop('title')
      ).toEqual(useGetCasesMockState.data.cases[0].tags[0]);
      expect(wrapper.find(`[data-test-subj="case-table-column-createdBy"]`).first().text()).toEqual(
        useGetCasesMockState.data.cases[0].createdBy.username
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

  it('should render empty fields', async () => {
    useGetCasesMock.mockReturnValue({
      ...defaultGetCases,
      filterOptions: { ...defaultGetCases.filterOptions, status: CaseStatuses.open },
      data: {
        ...defaultGetCases.data,
        cases: [
          {
            ...defaultGetCases.data.cases[0],
            id: null,
            createdAt: null,
            createdBy: null,
            status: null,
            tags: null,
            title: null,
            totalComment: null,
            totalAlerts: null,
          },
        ],
      },
    });

    const wrapper = mount(
      <TestProviders>
        <AllCasesList />
      </TestProviders>
    );

    const checkIt = (columnName: string, key: number) => {
      const column = wrapper.find('[data-test-subj="cases-table"] tbody .euiTableRowCell').at(key);
      expect(column.find('.euiTableRowCell--hideForDesktop').text()).toEqual(columnName);
      expect(column.find('span').text()).toEqual(emptyTag);
    };

    const { result } = renderHook<GetCasesColumn, CasesColumns[]>(
      () => useCasesColumns(defaultColumnArgs),
      {
        wrapper: ({ children }) => <TestProviders>{children}</TestProviders>,
      }
    );

    await waitFor(() => {
      result.current.map(
        (i, key) =>
          i.name != null &&
          !Object.prototype.hasOwnProperty.call(i, 'actions') &&
          checkIt(`${i.name}`, key)
      );
    });
  });

  it('should render delete actions for case', async () => {
    useGetCasesMock.mockReturnValue({
      ...defaultGetCases,
      filterOptions: { ...defaultGetCases.filterOptions, status: CaseStatuses.open },
    });
    const wrapper = mount(
      <TestProviders>
        <AllCasesList />
      </TestProviders>
    );
    await waitFor(() => {
      expect(wrapper.find('[data-test-subj="action-delete"]').first().props().disabled).toBeFalsy();
    });
  });

  it('should tableHeaderSortButton AllCasesList', async () => {
    const wrapper = mount(
      <TestProviders>
        <AllCasesList />
      </TestProviders>
    );
    wrapper.find('[data-test-subj="tableHeaderSortButton"]').first().simulate('click');
    await waitFor(() => {
      expect(setQueryParams).toBeCalledWith({
        page: 1,
        perPage: 5,
        sortField: 'createdAt',
        sortOrder: 'asc',
      });
    });
  });

  it('Updates status when status context menu is updated', async () => {
    const wrapper = mount(
      <TestProviders>
        <AllCasesList />
      </TestProviders>
    );
    wrapper.find(`[data-test-subj="case-view-status-dropdown"] button`).first().simulate('click');
    wrapper
      .find(`[data-test-subj="case-view-status-dropdown-closed"] button`)
      .first()
      .simulate('click');

    await waitFor(() => {
      const firstCase = useGetCasesMockState.data.cases[0];
      expect(dispatchUpdateCaseProperty.mock.calls[0][0]).toEqual(
        expect.objectContaining({
          caseId: firstCase.id,
          updateKey: 'status',
          updateValue: CaseStatuses.closed,
          version: firstCase.version,
        })
      );
    });
  });

  it.skip('Bulk delete', async () => {
    useGetCasesMock.mockReturnValue({
      ...defaultGetCases,
      filterOptions: { ...defaultGetCases.filterOptions, status: CaseStatuses.closed },
      selectedCases: [...useGetCasesMockState.data.cases, mockCase],
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
        <AllCasesList />
      </TestProviders>
    );

    wrapper.find('[data-test-subj="case-table-bulk-actions"] button').first().simulate('click');
    wrapper.find('[data-test-subj="cases-bulk-delete-button"]').first().simulate('click');

    wrapper
      .find(
        '[data-test-subj="confirm-delete-case-modal"] [data-test-subj="confirmModalConfirmButton"]'
      )
      .last()
      .simulate('click');

    await waitFor(() => {
      expect(handleToggleModal).toBeCalled();

      expect(handleOnDeleteConfirm.mock.calls[0][0]).toStrictEqual([
        ...useGetCasesMockState.data.cases.map(({ id, title }) => ({ id, title })),
        {
          id: mockCase.id,
          title: mockCase.title,
        },
      ]);
    });
  });

  it('Renders only bulk delete on status all', async () => {
    useGetCasesMock.mockReturnValue({
      ...defaultGetCases,
      filterOptions: { ...defaultGetCases.filterOptions, status: StatusAll },
      selectedCases: [...useGetCasesMockState.data.cases],
    });

    const wrapper = mount(
      <TestProviders>
        <AllCasesList />
      </TestProviders>
    );

    wrapper.find('[data-test-subj="case-table-bulk-actions"] button').first().simulate('click');

    await waitFor(() => {
      expect(wrapper.find('[data-test-subj="cases-bulk-open-button"]').exists()).toEqual(false);
      expect(wrapper.find('[data-test-subj="cases-bulk-in-progress-button"]').exists()).toEqual(
        false
      );
      expect(wrapper.find('[data-test-subj="cases-bulk-close-button"]').exists()).toEqual(false);
      expect(
        wrapper.find('[data-test-subj="cases-bulk-delete-button"]').first().props().disabled
      ).toEqual(false);
    });
  });

  it('Bulk close status update', async () => {
    useGetCasesMock.mockReturnValue({
      ...defaultGetCases,
      filterOptions: { ...defaultGetCases.filterOptions, status: CaseStatuses.open },
      selectedCases: useGetCasesMockState.data.cases,
    });

    const wrapper = mount(
      <TestProviders>
        <AllCasesList />
      </TestProviders>
    );
    wrapper.find('[data-test-subj="case-table-bulk-actions"] button').first().simulate('click');
    wrapper.find('[data-test-subj="cases-bulk-close-button"]').first().simulate('click');

    await waitFor(() => {
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
        <AllCasesList />
      </TestProviders>
    );
    wrapper.find('[data-test-subj="case-table-bulk-actions"] button').first().simulate('click');
    wrapper.find('[data-test-subj="cases-bulk-open-button"]').first().simulate('click');
    await waitFor(() => {
      expect(updateBulkStatus).toBeCalledWith(useGetCasesMockState.data.cases, CaseStatuses.open);
    });
  });

  it('Bulk in-progress status update', async () => {
    useGetCasesMock.mockReturnValue({
      ...defaultGetCases,
      filterOptions: { ...defaultGetCases.filterOptions, status: CaseStatuses.open },
      selectedCases: useGetCasesMockState.data.cases,
    });

    const wrapper = mount(
      <TestProviders>
        <AllCasesList />
      </TestProviders>
    );
    wrapper.find('[data-test-subj="case-table-bulk-actions"] button').first().simulate('click');
    wrapper.find('[data-test-subj="cases-bulk-in-progress-button"]').first().simulate('click');
    await waitFor(() => {
      expect(updateBulkStatus).toBeCalledWith(
        useGetCasesMockState.data.cases,
        CaseStatuses['in-progress']
      );
    });
  });

  it('isDeleted is true, refetch', async () => {
    useDeleteCasesMock.mockReturnValue({
      ...defaultDeleteCases,
      isDeleted: true,
    });

    mount(
      <TestProviders>
        <AllCasesList />
      </TestProviders>
    );
    await waitFor(() => {
      expect(refetchCases).toBeCalled();
      // expect(fetchCasesStatus).toBeCalled();
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
        <AllCasesList />
      </TestProviders>
    );
    await waitFor(() => {
      expect(refetchCases).toBeCalled();
      // expect(fetchCasesStatus).toBeCalled();
      expect(dispatchResetIsUpdated).toBeCalled();
    });
  });

  it('should not render table utility bar when isSelectorView=true', async () => {
    const wrapper = mount(
      <TestProviders>
        <AllCasesList isSelectorView={true} />
      </TestProviders>
    );
    await waitFor(() => {
      expect(wrapper.find('[data-test-subj="case-table-selected-case-count"]').exists()).toBe(
        false
      );
      expect(wrapper.find('[data-test-subj="case-table-bulk-actions"]').exists()).toBe(false);
    });
  });

  it('case table should not be selectable when isSelectorView=true', async () => {
    const wrapper = mount(
      <TestProviders>
        <AllCasesList isSelectorView={true} />
      </TestProviders>
    );
    await waitFor(() => {
      expect(wrapper.find('[data-test-subj="cases-table"]').first().prop('isSelectable')).toBe(
        false
      );
    });
  });

  it('should call postComment when a case is selected in isSelectorView=true and has attachments', async () => {
    const postCommentMockedValue = { status: { isLoading: false }, postComment: jest.fn() };
    usePostCommentMock.mockReturnValueOnce(postCommentMockedValue);
    const wrapper = mount(
      <TestProviders>
        <AllCasesList
          isSelectorView={true}
          attachments={[
            {
              type: CommentType.alert,
              alertId: 'alert-id-201',
              owner: 'test',
              index: 'index-id-1',
              rule: {
                id: 'rule-id-1',
                name: 'Awesome myrule',
              },
            },
          ]}
        />
      </TestProviders>
    );
    wrapper.find('[data-test-subj="cases-table-row-select-1"]').first().simulate('click');
    await waitFor(() => {
      expect(postCommentMockedValue.postComment).toHaveBeenCalledWith({
        caseId: '1',
        data: {
          alertId: 'alert-id-201',
          index: 'index-id-1',
          owner: 'test',
          rule: {
            id: 'rule-id-1',
            name: 'Awesome myrule',
          },
          type: 'alert',
        },
      });
    });
  });

  it('should call onRowClick with no cases and isSelectorView=true', async () => {
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
        <AllCasesList isSelectorView={true} onRowClick={onRowClick} />
      </TestProviders>
    );
    wrapper.find('[data-test-subj="cases-table-add-case"]').first().simulate('click');
    await waitFor(() => {
      expect(onRowClick).toHaveBeenCalled();
    });
  });

  it('should call onRowClick when clicking a case with modal=true', async () => {
    const wrapper = mount(
      <TestProviders>
        <AllCasesList isSelectorView={true} onRowClick={onRowClick} />
      </TestProviders>
    );

    wrapper.find('[data-test-subj="cases-table-row-select-1"]').first().simulate('click');
    await waitFor(() => {
      expect(onRowClick).toHaveBeenCalledWith({
        closedAt: null,
        closedBy: null,
        comments: [],
        connector: { fields: null, id: '123', name: 'My Connector', type: '.jira' },
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
        owner: SECURITY_SOLUTION_OWNER,
        status: 'open',
        tags: ['coke', 'pepsi'],
        title: 'Another horrible breach!!',
        totalAlerts: 0,
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
        <AllCasesList isSelectorView={false} />
      </TestProviders>
    );
    wrapper.find('[data-test-subj="cases-table-row-1"]').first().simulate('click');
    await waitFor(() => {
      expect(onRowClick).not.toHaveBeenCalled();
    });
  });

  it('should change the status to closed', async () => {
    const wrapper = mount(
      <TestProviders>
        <AllCasesList isSelectorView={false} />
      </TestProviders>
    );
    wrapper.find('button[data-test-subj="case-status-filter"]').simulate('click');
    wrapper.find('button[data-test-subj="case-status-filter-closed"]').simulate('click');
    await waitFor(() => {
      expect(setQueryParams).toBeCalledWith({
        sortField: 'closedAt',
      });
    });
  });

  it('should change the status to in-progress', async () => {
    const wrapper = mount(
      <TestProviders>
        <AllCasesList isSelectorView={false} />
      </TestProviders>
    );
    wrapper.find('button[data-test-subj="case-status-filter"]').simulate('click');
    wrapper.find('button[data-test-subj="case-status-filter-in-progress"]').simulate('click');
    await waitFor(() => {
      expect(setQueryParams).toBeCalledWith({
        sortField: 'createdAt',
      });
    });
  });

  it('should change the status to open', async () => {
    const wrapper = mount(
      <TestProviders>
        <AllCasesList isSelectorView={false} />
      </TestProviders>
    );
    wrapper.find('button[data-test-subj="case-status-filter"]').simulate('click');
    wrapper.find('button[data-test-subj="case-status-filter-open"]').simulate('click');
    await waitFor(() => {
      expect(setQueryParams).toBeCalledWith({
        sortField: 'createdAt',
      });
    });
  });

  it('should show the correct count on stats', async () => {
    const wrapper = mount(
      <TestProviders>
        <AllCasesList isSelectorView={false} />
      </TestProviders>
    );
    wrapper.find('button[data-test-subj="case-status-filter"]').simulate('click');
    await waitFor(() => {
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

  it('should not render status when isSelectorView=true', async () => {
    const wrapper = mount(
      <TestProviders>
        <AllCasesList isSelectorView={true} />
      </TestProviders>
    );

    const { result } = renderHook<GetCasesColumn, CasesColumns[]>(
      () =>
        useCasesColumns({
          ...defaultColumnArgs,
          isSelectorView: true,
        }),
      {
        wrapper: ({ children }) => <TestProviders>{children}</TestProviders>,
      }
    );

    expect(result.current.find((i) => i.name === 'Status')).toBeFalsy();

    await waitFor(() => {
      expect(wrapper.find('[data-test-subj="cases-table"]').exists()).toBeTruthy();
    });

    expect(wrapper.find('[data-test-subj="case-view-status-dropdown"]').exists()).toBeFalsy();
  });

  it.skip('renders the first available status when hiddenStatus is given', async () => {
    const wrapper = mount(
      <TestProviders>
        <AllCasesList hiddenStatuses={[StatusAll, CaseStatuses.open]} isSelectorView={true} />
      </TestProviders>
    );

    expect(wrapper.find('[data-test-subj="status-badge-in-progress"]').exists()).toBeTruthy();
  });

  it('should call doRefresh if provided', async () => {
    const doRefresh = jest.fn();

    const wrapper = mount(
      <TestProviders>
        <AllCasesList isSelectorView={false} doRefresh={doRefresh} />
      </TestProviders>
    );

    await act(async () => {
      wrapper.find('[data-test-subj="all-cases-refresh"] button').first().simulate('click');
    });

    expect(doRefresh).toHaveBeenCalled();
  });

  it('shows Solution column if there are no set owners', async () => {
    const doRefresh = jest.fn();

    const wrapper = mount(
      <TestProviders owner={[]}>
        <AllCasesList isSelectorView={false} doRefresh={doRefresh} />
      </TestProviders>
    );

    await waitFor(() => {
      const solutionHeader = wrapper.find({ children: 'Solution' });
      expect(solutionHeader.exists()).toBeTruthy();
    });
  });

  it('hides Solution column if there is a set owner', async () => {
    const doRefresh = jest.fn();

    const wrapper = mount(
      <TestProviders>
        <AllCasesList isSelectorView={false} doRefresh={doRefresh} />
      </TestProviders>
    );

    await waitFor(() => {
      const solutionHeader = wrapper.find({ children: 'Solution' });
      expect(solutionHeader.exists()).toBeFalsy();
    });
  });

  it('should deselect cases when refreshing', async () => {
    useGetCasesMock.mockReturnValue({
      ...defaultGetCases,
      selectedCases: [],
    });

    render(
      <TestProviders>
        <AllCasesList />
      </TestProviders>
    );

    const allCheckbox = await screen.findByTestId('checkboxSelectAll');
    userEvent.click(allCheckbox);
    const checkboxes = await screen.findAllByRole('checkbox');

    for (const checkbox of checkboxes) {
      expect(checkbox).toBeChecked();
    }

    userEvent.click(screen.getByText('Refresh'));
    for (const checkbox of checkboxes) {
      expect(checkbox).not.toBeChecked();
    }

    await waitForComponentToUpdate();
  });

  it('should deselect cases when changing filters', async () => {
    useGetCasesMock.mockReturnValue({
      ...defaultGetCases,
      selectedCases: [],
    });

    render(
      <TestProviders>
        <AllCasesList />
      </TestProviders>
    );

    const allCheckbox = await screen.findByTestId('checkboxSelectAll');

    userEvent.click(allCheckbox);
    const checkboxes = await screen.findAllByRole('checkbox');

    for (const checkbox of checkboxes) {
      expect(checkbox).toBeChecked();
    }

    userEvent.click(screen.getByTestId('case-status-filter'));
    userEvent.click(screen.getByTestId('case-status-filter-closed'));

    for (const checkbox of checkboxes) {
      expect(checkbox).not.toBeChecked();
    }

    await waitForComponentToUpdate();
  });

  it('should hide the alerts column if the alert feature is disabled', async () => {
    expect.assertions(1);

    const { findAllByTestId } = render(
      <TestProviders features={{ alerts: { enabled: false } }}>
        <AllCasesList />
      </TestProviders>
    );

    await expect(findAllByTestId('case-table-column-alertsCount')).rejects.toThrow();
  });

  it('should show the alerts column if the alert feature is enabled', async () => {
    const { findAllByTestId } = render(
      <TestProviders features={{ alerts: { enabled: true } }}>
        <AllCasesList />
      </TestProviders>
    );

    const alertCounts = await findAllByTestId('case-table-column-alertsCount');

    expect(alertCounts.length).toBeGreaterThan(0);
  });

  it('should show the alerts column if the alert object is empty', async () => {
    const { findAllByTestId } = render(
      <TestProviders features={{ alerts: {} }}>
        <AllCasesList />
      </TestProviders>
    );

    const alertCounts = await findAllByTestId('case-table-column-alertsCount');

    expect(alertCounts.length).toBeGreaterThan(0);
  });
});
