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
import { waitForEuiPopoverOpen } from '@elastic/eui/lib/test/rtl';

import '../../common/mock/match_media';
import {
  AppMockRenderer,
  createAppMockRenderer,
  noDeleteCasesPermissions,
  TestProviders,
} from '../../common/mock';
import { casesStatus, useGetCasesMockState, mockCase, connectorsMock } from '../../containers/mock';

import { StatusAll } from '../../../common/ui/types';
import { CaseSeverity, CaseStatuses } from '../../../common/api';
import { SECURITY_SOLUTION_OWNER } from '../../../common/constants';
import { getEmptyTagValue } from '../empty_value';
import { useDeleteCases } from '../../containers/use_delete_cases';
import { useGetCasesStatus } from '../../containers/use_get_cases_status';
import { useUpdateCases } from '../../containers/use_bulk_update_case';
import { useKibana } from '../../common/lib/kibana';
import { AllCasesList } from './all_cases_list';
import { CasesColumns, GetCasesColumn, useCasesColumns } from './columns';
import { triggersActionsUiMock } from '@kbn/triggers-actions-ui-plugin/public/mocks';
import { registerConnectorsToMockActionRegistry } from '../../common/mock/register_connectors';
import { createStartServicesMock } from '../../common/lib/kibana/kibana_react.mock';
import { waitForComponentToUpdate } from '../../common/test_utils';
import { useCreateAttachments } from '../../containers/use_create_attachments';
import { useGetReporters } from '../../containers/use_get_reporters';
import { useGetCasesMetrics } from '../../containers/use_get_cases_metrics';
import { useGetConnectors } from '../../containers/configure/use_connectors';
import { useGetTags } from '../../containers/use_get_tags';
import { useUpdateCase } from '../../containers/use_update_case';
import { useGetCases } from '../../containers/use_get_cases';

jest.mock('../../containers/use_create_attachments');
jest.mock('../../containers/use_bulk_update_case');
jest.mock('../../containers/use_delete_cases');
jest.mock('../../containers/use_get_cases');
jest.mock('../../containers/use_get_cases_status');
jest.mock('../../containers/use_get_cases_metrics');
jest.mock('../../containers/use_get_action_license');
jest.mock('../../containers/use_get_tags');
jest.mock('../../containers/use_get_reporters');
jest.mock('../../containers/configure/use_connectors');
jest.mock('../../common/lib/kibana');
jest.mock('../../common/navigation/hooks');
jest.mock('../app/use_available_owners', () => ({
  useAvailableCasesOwners: () => ['securitySolution', 'observability'],
}));
jest.mock('../../containers/use_update_case');

const useDeleteCasesMock = useDeleteCases as jest.Mock;
const useGetCasesMock = useGetCases as jest.Mock;
const useGetCasesStatusMock = useGetCasesStatus as jest.Mock;
const useGetCasesMetricsMock = useGetCasesMetrics as jest.Mock;
const useUpdateCasesMock = useUpdateCases as jest.Mock;
const useGetTagsMock = useGetTags as jest.Mock;
const useGetReportersMock = useGetReporters as jest.Mock;
const useKibanaMock = useKibana as jest.MockedFunction<typeof useKibana>;
const useGetConnectorsMock = useGetConnectors as jest.Mock;
const useCreateAttachmentsMock = useCreateAttachments as jest.Mock;
const useUpdateCaseMock = useUpdateCase as jest.Mock;

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
  const handleOnDeleteConfirm = jest.fn();
  const handleToggleModal = jest.fn();
  const refetchCases = jest.fn();
  const updateBulkStatus = jest.fn();
  const fetchCasesStatus = jest.fn();
  const onRowClick = jest.fn();
  const updateCaseProperty = jest.fn();

  const emptyTag = getEmptyTagValue().props.children;
  useCreateAttachmentsMock.mockReturnValue({
    status: { isLoading: false },
    createAttachments: jest.fn(),
  });

  const defaultGetCases = {
    ...useGetCasesMockState,
    refetch: refetchCases,
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

  const defaultCasesMetrics = {
    mttr: 5,
    isLoading: false,
    fetchCasesMetrics: jest.fn(),
  };

  const defaultUpdateCases = {
    isUpdated: false,
    isLoading: false,
    isError: false,
    dispatchResetIsUpdated,
    updateBulkStatus,
  };

  const defaultColumnArgs = {
    caseDetailsNavigation: {
      href: jest.fn(),
      onClick: jest.fn(),
    },
    filterStatus: CaseStatuses.open,
    handleIsLoading: jest.fn(),
    isLoadingCases: [],
    isSelectorView: false,
  };

  let appMockRenderer: AppMockRenderer;

  beforeAll(() => {
    mockKibana();
    const actionTypeRegistry = useKibanaMock().services.triggersActionsUi.actionTypeRegistry;
    registerConnectorsToMockActionRegistry(actionTypeRegistry, connectorsMock);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    appMockRenderer = createAppMockRenderer();
    useUpdateCasesMock.mockReturnValue(defaultUpdateCases);
    useGetCasesMock.mockReturnValue(defaultGetCases);
    useDeleteCasesMock.mockReturnValue(defaultDeleteCases);
    useGetCasesStatusMock.mockReturnValue(defaultCasesStatus);
    useGetCasesMetricsMock.mockReturnValue(defaultCasesMetrics);
    useGetTagsMock.mockReturnValue({ data: ['coke', 'pepsi'], refetch: jest.fn() });
    useGetReportersMock.mockReturnValue({
      reporters: ['casetester'],
      respReporters: [{ username: 'casetester' }],
      isLoading: true,
      isError: false,
      fetchReporters: jest.fn(),
    });
    useGetConnectorsMock.mockImplementation(() => ({ data: connectorsMock, isLoading: false }));
    useUpdateCaseMock.mockReturnValue({ updateCaseProperty });
    mockKibana();
    moment.tz.setDefault('UTC');
  });

  it('should render AllCasesList', async () => {
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
        wrapper.find(`span[data-test-subj="case-table-column-tags-coke"]`).first().prop('title')
      ).toEqual(useGetCasesMockState.data.cases[0].tags[0]);
      expect(wrapper.find(`[data-test-subj="case-table-column-createdBy"]`).first().text()).toEqual(
        'LK'
      );
      expect(
        wrapper
          .find(`[data-test-subj="case-table-column-createdAt"]`)
          .first()
          .childAt(0)
          .prop('value')
      ).toBe(useGetCasesMockState.data.cases[0].createdAt);

      expect(
        wrapper.find(`[data-test-subj="case-table-column-severity"]`).first().text().toLowerCase()
      ).toBe(useGetCasesMockState.data.cases[0].severity);

      expect(wrapper.find(`[data-test-subj="case-table-case-count"]`).first().text()).toEqual(
        'Showing 10 cases'
      );
    });
  });

  it('should show a tooltip with the reporter username when hover over the reporter avatar', async () => {
    const result = render(
      <TestProviders>
        <AllCasesList />
      </TestProviders>
    );

    userEvent.hover(result.queryAllByTestId('case-table-column-createdBy')[0]);

    await waitFor(() => {
      expect(result.getByTestId('case-table-column-createdBy-tooltip')).toBeTruthy();
      expect(result.getByTestId('case-table-column-createdBy-tooltip').textContent).toEqual(
        'lknope'
      );
    });
  });

  it('should show a tooltip with all tags when hovered', async () => {
    const result = render(
      <TestProviders>
        <AllCasesList />
      </TestProviders>
    );

    userEvent.hover(result.queryAllByTestId('case-table-column-tags')[0]);

    await waitFor(() => {
      expect(result.getByTestId('case-table-column-tags-tooltip')).toBeTruthy();
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
            status: null,
            severity: null,
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
      expect(useGetCasesMock).toBeCalledWith(
        expect.objectContaining({
          queryParams: {
            page: 1,
            perPage: 5,
            sortField: 'createdAt',
            sortOrder: 'asc',
          },
        })
      );
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
      expect(updateCaseProperty).toHaveBeenCalledWith({
        caseData: firstCase,
        updateKey: 'status',
        updateValue: CaseStatuses.closed,
        onSuccess: expect.anything(),
      });
    });
  });

  it('should render the case stats', () => {
    const wrapper = mount(
      <TestProviders>
        <AllCasesList />
      </TestProviders>
    );
    expect(wrapper.find('[data-test-subj="cases-count-stats"]')).toBeTruthy();
  });

  it.skip('Bulk delete', async () => {
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
    const wrapper = mount(
      <TestProviders>
        <AllCasesList />
      </TestProviders>
    );

    wrapper.find('[data-test-subj*="checkboxSelectRow-"]').first().simulate('click');
    wrapper.find('[data-test-subj="case-table-bulk-actions"] button').first().simulate('click');

    await waitFor(() => {
      expect(wrapper.find('[data-test-subj="cases-bulk-open-button"]').exists()).toEqual(false);
      expect(wrapper.find('[data-test-subj="cases-bulk-in-progress-button"]').exists()).toEqual(
        false
      );
      expect(wrapper.find('[data-test-subj="cases-bulk-close-button"]').exists()).toEqual(false);
      expect(
        wrapper.find('[data-test-subj="cases-bulk-delete-button"]').first().props().disabled
      ).toEqual(true);
    });
  });

  it('Bulk close status update', async () => {
    const result = appMockRenderer.render(<AllCasesList />);
    const theCase = useGetCasesMockState.data.cases[0];
    userEvent.click(result.getByTestId('case-status-filter'));
    await waitForEuiPopoverOpen();
    userEvent.click(result.getByTestId('case-status-filter-in-progress'));
    userEvent.click(result.getByTestId(`checkboxSelectRow-${theCase.id}`));
    userEvent.click(result.getByText('Bulk actions'));
    await waitForEuiPopoverOpen();
    userEvent.click(result.getByTestId('cases-bulk-close-button'));
    await waitFor(() => {});
    expect(updateBulkStatus).toBeCalledWith([theCase], CaseStatuses.closed);
  });

  it('Bulk open status update', async () => {
    const result = appMockRenderer.render(<AllCasesList />);
    const theCase = useGetCasesMockState.data.cases[0];
    userEvent.click(result.getByTestId('case-status-filter'));
    await waitForEuiPopoverOpen();
    userEvent.click(result.getByTestId('case-status-filter-closed'));
    userEvent.click(result.getByTestId(`checkboxSelectRow-${theCase.id}`));
    userEvent.click(result.getByText('Bulk actions'));
    await waitForEuiPopoverOpen();
    userEvent.click(result.getByTestId('cases-bulk-open-button'));
    await waitFor(() => {});
    expect(updateBulkStatus).toBeCalledWith([theCase], CaseStatuses.open);
  });

  it('Bulk in-progress status update', async () => {
    const result = appMockRenderer.render(<AllCasesList />);
    const theCase = useGetCasesMockState.data.cases[0];
    userEvent.click(result.getByTestId('case-status-filter'));
    await waitForEuiPopoverOpen();
    userEvent.click(result.getByTestId('case-status-filter-closed'));
    userEvent.click(result.getByTestId(`checkboxSelectRow-${theCase.id}`));
    userEvent.click(result.getByText('Bulk actions'));
    await waitForEuiPopoverOpen();
    userEvent.click(result.getByTestId('cases-bulk-in-progress-button'));
    await waitFor(() => {});
    expect(updateBulkStatus).toBeCalledWith([theCase], CaseStatuses['in-progress']);
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

  it('should not render table utility bar when the user does not have permissions to delete', async () => {
    const wrapper = mount(
      <TestProviders permissions={noDeleteCasesPermissions()}>
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

  it('should render metrics when isSelectorView=false', async () => {
    const wrapper = mount(
      <TestProviders>
        <AllCasesList isSelectorView={false} />
      </TestProviders>
    );
    await waitFor(() => {
      expect(wrapper.find('[data-test-subj="cases-metrics-stats"]').exists()).toBe(true);
    });
  });

  it('should not render metrics when isSelectorView=true', async () => {
    const wrapper = mount(
      <TestProviders>
        <AllCasesList isSelectorView={true} />
      </TestProviders>
    );
    await waitFor(() => {
      expect(wrapper.find('[data-test-subj="case-table-selected-case-count"]').exists()).toBe(
        false
      );
      expect(wrapper.find('[data-test-subj="cases-metrics-stats"]').exists()).toBe(false);
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

  it('should call onRowClick with no cases and isSelectorView=true when create case is clicked', async () => {
    const result = appMockRenderer.render(
      <AllCasesList isSelectorView={true} onRowClick={onRowClick} />
    );
    userEvent.click(result.getByTestId('cases-table-add-case-filter-bar'));

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
        assignees: [],
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
        severity: CaseSeverity.LOW,
        duration: null,
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
    const result = appMockRenderer.render(<AllCasesList isSelectorView={false} />);
    userEvent.click(result.getByTestId('case-status-filter'));
    await waitForEuiPopoverOpen();
    userEvent.click(result.getByTestId('case-status-filter-closed'));
    await waitFor(() => {
      expect(useGetCasesMock).toHaveBeenLastCalledWith(
        expect.objectContaining({
          queryParams: {
            page: 1,
            perPage: 5,
            sortField: 'closedAt',
            sortOrder: 'desc',
          },
        })
      );
    });
  });

  it('should change the status to in-progress', async () => {
    const result = appMockRenderer.render(<AllCasesList isSelectorView={false} />);
    userEvent.click(result.getByTestId('case-status-filter'));
    await waitForEuiPopoverOpen();
    userEvent.click(result.getByTestId('case-status-filter-in-progress'));
    await waitFor(() => {
      expect(useGetCasesMock).toHaveBeenLastCalledWith(
        expect.objectContaining({
          queryParams: {
            page: 1,
            perPage: 5,
            sortField: 'createdAt',
            sortOrder: 'desc',
          },
        })
      );
    });
  });

  it('should change the status to open', async () => {
    const result = appMockRenderer.render(<AllCasesList isSelectorView={false} />);
    userEvent.click(result.getByTestId('case-status-filter'));
    await waitForEuiPopoverOpen();
    userEvent.click(result.getByTestId('case-status-filter-in-progress'));
    await waitFor(() => {
      expect(useGetCasesMock).toHaveBeenLastCalledWith(
        expect.objectContaining({
          queryParams: {
            page: 1,
            perPage: 5,
            sortField: 'createdAt',
            sortOrder: 'desc',
          },
        })
      );
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
    await waitForEuiPopoverOpen();
    userEvent.click(screen.getByTestId('case-status-filter-closed'));

    for (const checkbox of checkboxes) {
      expect(checkbox).not.toBeChecked();
    }

    await waitForComponentToUpdate();
  });

  it('should hide the alerts column if the alert feature is disabled', async () => {
    const result = render(
      <TestProviders features={{ alerts: { enabled: false } }}>
        <AllCasesList />
      </TestProviders>
    );

    await waitFor(() => {
      expect(result.getByTestId('cases-table')).toBeTruthy();
      expect(result.queryAllByTestId('case-table-column-alertsCount').length).toBe(0);
    });
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
