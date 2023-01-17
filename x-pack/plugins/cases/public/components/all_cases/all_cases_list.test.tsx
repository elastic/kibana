/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import moment from 'moment-timezone';
import { render, waitFor, screen, act, within } from '@testing-library/react';
import { renderHook } from '@testing-library/react-hooks';
import userEvent from '@testing-library/user-event';
import { waitForEuiPopoverOpen } from '@elastic/eui/lib/test/rtl';

import '../../common/mock/match_media';
import type { AppMockRenderer } from '../../common/mock';
import {
  createAppMockRenderer,
  noDeleteCasesPermissions,
  readCasesPermissions,
  TestProviders,
} from '../../common/mock';
import { useGetCasesMockState, connectorsMock } from '../../containers/mock';

import { SortFieldCase, StatusAll } from '../../../common/ui/types';
import { CaseSeverity, CaseStatuses } from '../../../common/api';
import { SECURITY_SOLUTION_OWNER } from '../../../common/constants';
import { getEmptyTagValue } from '../empty_value';
import { useKibana } from '../../common/lib/kibana';
import { AllCasesList } from './all_cases_list';
import type { GetCasesColumn, UseCasesColumnsReturnValue } from './use_cases_columns';
import { useCasesColumns } from './use_cases_columns';
import { triggersActionsUiMock } from '@kbn/triggers-actions-ui-plugin/public/mocks';
import { registerConnectorsToMockActionRegistry } from '../../common/mock/register_connectors';
import { createStartServicesMock } from '../../common/lib/kibana/kibana_react.mock';
import { waitForComponentToUpdate } from '../../common/test_utils';
import { useCreateAttachments } from '../../containers/use_create_attachments';
import { useGetConnectors } from '../../containers/configure/use_connectors';
import { useGetTags } from '../../containers/use_get_tags';
import { useUpdateCase } from '../../containers/use_update_case';
import { useGetCases, DEFAULT_QUERY_PARAMS } from '../../containers/use_get_cases';
import { useGetCurrentUserProfile } from '../../containers/user_profiles/use_get_current_user_profile';
import { userProfiles, userProfilesMap } from '../../containers/user_profiles/api.mock';
import { useBulkGetUserProfiles } from '../../containers/user_profiles/use_bulk_get_user_profiles';
import { useLicense } from '../../common/use_license';
import * as api from '../../containers/api';

jest.mock('../../containers/use_create_attachments');
jest.mock('../../containers/use_get_cases');
jest.mock('../../containers/use_get_action_license');
jest.mock('../../containers/use_get_tags');
jest.mock('../../containers/user_profiles/use_get_current_user_profile');
jest.mock('../../containers/user_profiles/use_bulk_get_user_profiles');
jest.mock('../../containers/configure/use_connectors');
jest.mock('../../common/lib/kibana');
jest.mock('../../common/navigation/hooks');
jest.mock('../app/use_available_owners', () => ({
  useAvailableCasesOwners: () => ['securitySolution', 'observability'],
}));
jest.mock('../../containers/use_update_case');
jest.mock('../../common/use_license');

const useGetCasesMock = useGetCases as jest.Mock;
const useGetTagsMock = useGetTags as jest.Mock;
const useGetCurrentUserProfileMock = useGetCurrentUserProfile as jest.Mock;
const useBulkGetUserProfilesMock = useBulkGetUserProfiles as jest.Mock;
const useKibanaMock = useKibana as jest.MockedFunction<typeof useKibana>;
const useGetConnectorsMock = useGetConnectors as jest.Mock;
const useCreateAttachmentsMock = useCreateAttachments as jest.Mock;
const useUpdateCaseMock = useUpdateCase as jest.Mock;
const useLicenseMock = useLicense as jest.Mock;

const mockTriggersActionsUiService = triggersActionsUiMock.createStart();

const mockKibana = () => {
  useKibanaMock.mockReturnValue({
    services: {
      ...createStartServicesMock(),
      triggersActionsUi: mockTriggersActionsUiService,
    },
  } as unknown as ReturnType<typeof useKibana>);
};

// Flaky: https://github.com/elastic/kibana/issues/148486
describe('AllCasesListGeneric', () => {
  const refetchCases = jest.fn();
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

  const defaultColumnArgs = {
    filterStatus: CaseStatuses.open,
    handleIsLoading: jest.fn(),
    isLoadingCases: [],
    isSelectorView: false,
    userProfiles: new Map(),
    currentUserProfile: undefined,
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
    useGetCasesMock.mockReturnValue(defaultGetCases);
    useGetTagsMock.mockReturnValue({ data: ['coke', 'pepsi'], refetch: jest.fn() });
    useGetCurrentUserProfileMock.mockReturnValue({ data: userProfiles[0], isLoading: false });
    useBulkGetUserProfilesMock.mockReturnValue({ data: userProfilesMap });
    useGetConnectorsMock.mockImplementation(() => ({ data: connectorsMock, isLoading: false }));
    useUpdateCaseMock.mockReturnValue({ updateCaseProperty });
    useLicenseMock.mockReturnValue({ isAtLeastPlatinum: () => false });
    mockKibana();
    moment.tz.setDefault('UTC');
    window.localStorage.clear();
  });

  it('should render AllCasesList', async () => {
    useLicenseMock.mockReturnValue({ isAtLeastPlatinum: () => true });

    const res = render(
      <TestProviders>
        <AllCasesList />
      </TestProviders>
    );

    await waitFor(() => {
      expect(res.getAllByTestId('case-details-link')[0]).toHaveAttribute('href','/app/security/cases/test');
      expect(res.getAllByTestId('case-details-link')[0]).toHaveTextContent(
        useGetCasesMockState.data.cases[0].title
      );
      expect(
        res.getAllByTestId('case-user-profile-avatar-damaged_raccoon')[0]
      ).toHaveTextContent('DR');
      expect(
        res.getAllByTestId('case-table-column-tags-coke')[0]
      ).toHaveAttribute('title', useGetCasesMockState.data.cases[0].tags[0]);
      expect(
        res.getAllByTestId('case-table-column-createdAt')[0].querySelector('.euiToolTipAnchor')
      ).toHaveTextContent(useGetCasesMockState.data.cases[0].createdAt);
      expect(res.getByTestId('case-table-case-count')).toHaveTextContent(
        'Showing 10 cases'
      );
    });
  });

  it("should show a tooltip with the assignee's email when hover over the assignee avatar", async () => {
    useLicenseMock.mockReturnValue({ isAtLeastPlatinum: () => true });

    const result = render(
      <TestProviders>
        <AllCasesList />
      </TestProviders>
    );

    userEvent.hover(result.queryAllByTestId('case-user-profile-avatar-damaged_raccoon')[0]);

    await waitFor(() => {
      expect(result.getByText('damaged_raccoon@elastic.co')).toBeInTheDocument();
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
            assignees: [],
          },
        ],
      },
    });

    const res = render(
      <TestProviders>
        <AllCasesList />
      </TestProviders>
    );

    const checkIt = (columnName: string, key: number) => {
      const column = res.getByTestId('cases-table').querySelectorAll('tbody .euiTableRowCell');
      expect(column[key].querySelector('.euiTableRowCell--hideForDesktop')).toHaveTextContent(columnName);
      expect(column[key].querySelector('span')).toHaveTextContent(emptyTag);
    };

    const { result } = renderHook<GetCasesColumn, UseCasesColumnsReturnValue>(
      () => useCasesColumns(defaultColumnArgs),
      {
        wrapper: ({ children }) => <TestProviders>{children}</TestProviders>,
      }
    );

    await waitFor(() => {
      result.current.columns.map(
        (i, key) => i.name != null && i.name !== 'Actions' && checkIt(`${i.name}`, key)
      );
    });
  });

  it('should tableHeaderSortButton AllCasesList', async () => {
    const res = render(
      <TestProviders>
        <AllCasesList />
      </TestProviders>
    );

    userEvent.click(res.getAllByTestId('tableHeaderSortButton')[0]);

    await waitFor(() => {
      expect(useGetCasesMock).toBeCalledWith(
        expect.objectContaining({
          queryParams: {
            ...DEFAULT_QUERY_PARAMS,
          },
        })
      );
    });
  });

  it('renders the title column', async () => {
    const res = appMockRenderer.render(<AllCasesList />);

    expect(res.getByTestId('tableHeaderCell_title_0')).toBeInTheDocument();
  });

  it('renders the status column', async () => {
    const res = appMockRenderer.render(<AllCasesList />);

    expect(res.getByTestId('tableHeaderCell_status_6')).toBeInTheDocument();
  });

  it('renders the severity column', async () => {
    const res = appMockRenderer.render(<AllCasesList />);

    expect(res.getByTestId('tableHeaderCell_severity_7')).toBeInTheDocument();
  });

  // it('should render the case stats', async () => {
  //   const res = render(
  //     <TestProviders>
  //       <AllCasesList />
  //     </TestProviders>
  //   );
    
  //   await waitFor(() => 
  //     expect(res.getByTestId('cases-count-stats')).toBeInTheDocument()
  //   );
  // });

  it('should not render table utility bar when isSelectorView=true', async () => {
    const res = appMockRenderer.render(<AllCasesList isSelectorView={true} />); 

    await waitFor(() => {
      expect(res.queryByTestId('case-table-selected-case-count')).not.toBeInTheDocument();
      expect(res.queryByTestId('case-table-bulk-actions')).not.toBeInTheDocument();
    });
  });

  it('should not render table utility bar when the user does not have permissions to delete', async () => {
    const res = render(
      <TestProviders permissions={noDeleteCasesPermissions()}>
        <AllCasesList isSelectorView={true} />
      </TestProviders>
    );

    await waitFor(() => {
      expect(res.queryByTestId('case-table-selected-case-count')).not.toBeInTheDocument();
      expect(res.queryByTestId('case-table-bulk-actions')).not.toBeInTheDocument();
    });
  });

  it('should render metrics when isSelectorView=false', async () => {
    const res = render(
      <TestProviders>
        <AllCasesList isSelectorView={false} />
      </TestProviders>
    );
    await waitFor(() => {
      expect(res.getByTestId('cases-metrics-stats')).toBeInTheDocument();
    });
  });

  it('should not render metrics when isSelectorView=true', async () => {
    const res = render(
      <TestProviders>
        <AllCasesList isSelectorView={true} />
      </TestProviders>
    );
    await waitFor(() => {
      expect(res.queryByTestId('case-table-selected-case-count')).not.toBeInTheDocument();
      expect(res.queryByTestId('cases-metrics-stats')).not.toBeInTheDocument();
    });
  });

  it('case table should not be selectable when isSelectorView=true', async () => {
    const res = render(
      <TestProviders>
        <AllCasesList isSelectorView={true} />
      </TestProviders>
    );
    await waitFor(() => {
      expect(res.queryByTestId('cases-table')).not.toHaveAttribute('isSelectable');
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
    const theCase = defaultGetCases.data.cases[0];

    const res = render(
      <TestProviders>
        <AllCasesList isSelectorView={true} onRowClick={onRowClick} />
      </TestProviders>
    );

    userEvent.click(res.getByTestId(`cases-table-row-select-${theCase.id}`));

    await waitFor(() => {
      expect(onRowClick).toHaveBeenCalledWith(theCase);
    });
  });

  it('should NOT call onRowClick when clicking a case with modal=true', async () => {
    const res = render(
      <TestProviders>
        <AllCasesList isSelectorView={false} />
      </TestProviders>
    );

    userEvent.click(res.getByTestId('cases-table-row-1'));

    await waitFor(() => {
      expect(onRowClick).not.toHaveBeenCalled();
    });
  });

  it('should sort by status', async () => {
    const result = appMockRenderer.render(<AllCasesList isSelectorView={false} />);

    userEvent.click(
      within(result.getByTestId('tableHeaderCell_status_6')).getByTestId('tableHeaderSortButton')
    );

    await waitFor(() => {
      expect(useGetCasesMock).toHaveBeenLastCalledWith(
        expect.objectContaining({
          queryParams: {
            ...DEFAULT_QUERY_PARAMS,
            sortField: SortFieldCase.status,
            sortOrder: 'asc',
          },
        })
      );
    });
  });

  it('should sort by severity', async () => {
    const result = appMockRenderer.render(<AllCasesList isSelectorView={false} />);

    userEvent.click(
      within(result.getByTestId('tableHeaderCell_severity_7')).getByTestId('tableHeaderSortButton')
    );

    await waitFor(() => {
      expect(useGetCasesMock).toHaveBeenLastCalledWith(
        expect.objectContaining({
          queryParams: {
            ...DEFAULT_QUERY_PARAMS,
            sortField: SortFieldCase.severity,
            sortOrder: 'asc',
          },
        })
      );
    });
  });

  it('should sort by title', async () => {
    const result = appMockRenderer.render(<AllCasesList isSelectorView={false} />);

    userEvent.click(
      within(result.getByTestId('tableHeaderCell_title_0')).getByTestId('tableHeaderSortButton')
    );

    await waitFor(() => {
      expect(useGetCasesMock).toHaveBeenLastCalledWith(
        expect.objectContaining({
          queryParams: {
            ...DEFAULT_QUERY_PARAMS,
            sortField: SortFieldCase.title,
            sortOrder: 'asc',
          },
        })
      );
    });
  });

  it('should filter by status: closed', async () => {
    const result = appMockRenderer.render(<AllCasesList isSelectorView={false} />);
    userEvent.click(result.getByTestId('case-status-filter'));
    await waitForEuiPopoverOpen();
    userEvent.click(result.getByTestId('case-status-filter-closed'));
    await waitFor(() => {
      expect(useGetCasesMock).toHaveBeenLastCalledWith(
        expect.objectContaining({
          queryParams: { ...DEFAULT_QUERY_PARAMS, sortField: SortFieldCase.closedAt },
        })
      );
    });
  });

  it('should filter by status: in-progress', async () => {
    const result = appMockRenderer.render(<AllCasesList isSelectorView={false} />);
    userEvent.click(result.getByTestId('case-status-filter'));
    await waitForEuiPopoverOpen();
    userEvent.click(result.getByTestId('case-status-filter-in-progress'));
    await waitFor(() => {
      expect(useGetCasesMock).toHaveBeenLastCalledWith(
        expect.objectContaining({
          queryParams: DEFAULT_QUERY_PARAMS,
        })
      );
    });
  });

  it('should filter by status: open', async () => {
    const result = appMockRenderer.render(<AllCasesList isSelectorView={false} />);
    userEvent.click(result.getByTestId('case-status-filter'));
    await waitForEuiPopoverOpen();
    userEvent.click(result.getByTestId('case-status-filter-in-progress'));
    await waitFor(() => {
      expect(useGetCasesMock).toHaveBeenLastCalledWith(
        expect.objectContaining({
          queryParams: DEFAULT_QUERY_PARAMS,
        })
      );
    });
  });

  it('should show the correct count on stats', async () => {
    const res = render(
      <TestProviders>
        <AllCasesList isSelectorView={false} />
      </TestProviders>
    );
    
    userEvent.click(res.getByTestId('case-status-filter'));

    await waitFor(() => {
      expect(res.getByTestId('case-status-filter-open')).toHaveTextContent(
        'Open (20)'
      );
      expect(res.getByTestId('case-status-filter-in-progress')).toHaveTextContent(
        'In progress (40)'
      );
      expect(res.getByTestId('case-status-filter-closed')).toHaveTextContent(
        'Closed (130)'
      );
    });
  });

  it('renders the first available status when hiddenStatus is given', async () => {
    const res = render(
      <TestProviders>
        <AllCasesList hiddenStatuses={[StatusAll, CaseStatuses.open]} isSelectorView={true} />
      </TestProviders>
    );

    await waitFor(() => 
      expect(res.getAllByTestId('case-status-badge-in-progress')[0]).toBeInTheDocument()
    );
  });

  it('shows Solution column if there are no set owners', async () => {
    const res = render(
      <TestProviders owner={[]}>
        <AllCasesList isSelectorView={false} />
      </TestProviders>
    );

    await waitFor(() => {
      expect(res.getAllByText('Solution')[0]).toBeInTheDocument();
    });
  });

  it('hides Solution column if there is a set owner', async () => {
    const res = render(
      <TestProviders>
        <AllCasesList isSelectorView={false} />
      </TestProviders>
    );

    await waitFor(() => {
      expect(res.queryByText('Solution')).not.toBeInTheDocument();
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

  describe('Solutions', () => {
    it('should set the owner to all available solutions when deselecting all solutions', async () => {
      const { getByTestId } = appMockRenderer.render(
        <TestProviders owner={[]}>
          <AllCasesList />
        </TestProviders>
      );

      expect(useGetCasesMock).toHaveBeenCalledWith({
        filterOptions: {
          search: '',
          searchFields: [],
          severity: 'all',
          reporters: [],
          status: 'all',
          tags: [],
          assignees: [],
          owner: ['securitySolution', 'observability'],
        },
        queryParams: DEFAULT_QUERY_PARAMS,
      });

      userEvent.click(getByTestId('options-filter-popover-button-Solution'));

      await waitForEuiPopoverOpen();

      userEvent.click(
        getByTestId(`options-filter-popover-item-${SECURITY_SOLUTION_OWNER}`),
        undefined,
        {
          skipPointerEventsCheck: true,
        }
      );

      expect(useGetCasesMock).toBeCalledWith({
        filterOptions: {
          search: '',
          searchFields: [],
          severity: 'all',
          reporters: [],
          status: 'all',
          tags: [],
          assignees: [],
          owner: ['securitySolution'],
        },
        queryParams: DEFAULT_QUERY_PARAMS,
      });

      userEvent.click(
        getByTestId(`options-filter-popover-item-${SECURITY_SOLUTION_OWNER}`),
        undefined,
        {
          skipPointerEventsCheck: true,
        }
      );

      expect(useGetCasesMock).toHaveBeenLastCalledWith({
        filterOptions: {
          search: '',
          searchFields: [],
          severity: 'all',
          reporters: [],
          status: 'all',
          tags: [],
          assignees: [],
          owner: ['securitySolution', 'observability'],
        },
        queryParams: DEFAULT_QUERY_PARAMS,
      });
    });

    it('should hide the solutions filter if the owner is provided', async () => {
      const { queryByTestId } = appMockRenderer.render(
        <TestProviders owner={[SECURITY_SOLUTION_OWNER]}>
          <AllCasesList />
        </TestProviders>
      );

      expect(queryByTestId('options-filter-popover-button-Solution')).toBeFalsy();
    });

    it('should call useGetCases with the correct owner on initial render', async () => {
      appMockRenderer.render(
        <TestProviders owner={[SECURITY_SOLUTION_OWNER]}>
          <AllCasesList />
        </TestProviders>
      );

      expect(useGetCasesMock).toHaveBeenCalledWith({
        filterOptions: {
          search: '',
          searchFields: [],
          severity: 'all',
          reporters: [],
          status: 'all',
          tags: [],
          assignees: [],
          owner: ['securitySolution'],
        },
        queryParams: DEFAULT_QUERY_PARAMS,
      });
    });
  });

  describe('Actions', () => {
    const updateCasesSpy = jest.spyOn(api, 'updateCases');
    const deleteCasesSpy = jest.spyOn(api, 'deleteCases');

    describe('Bulk actions', () => {
      it('Renders bulk action', async () => {
        const result = appMockRenderer.render(<AllCasesList />);

        await waitForComponentToUpdate();

        act(() => {
          userEvent.click(result.getByTestId('checkboxSelectAll'));
        });

        act(() => {
          userEvent.click(result.getByText('Bulk actions'));
        });

        await waitForEuiPopoverOpen();

        expect(result.getByTestId('case-bulk-action-status')).toBeInTheDocument();
        expect(result.getByTestId('cases-bulk-action-delete')).toBeInTheDocument();
      });

      it.each([[CaseStatuses.open], [CaseStatuses['in-progress']], [CaseStatuses.closed]])(
        'Bulk update status: %s',
        async (status) => {
          const result = appMockRenderer.render(<AllCasesList />);

          await waitForComponentToUpdate();

          act(() => {
            userEvent.click(result.getByTestId('checkboxSelectAll'));
          });

          act(() => {
            userEvent.click(result.getByText('Bulk actions'));
          });

          await waitForEuiPopoverOpen();

          act(() => {
            userEvent.click(result.getByTestId('case-bulk-action-status'));
          });

          await waitFor(() => {
            expect(result.getByTestId(`cases-bulk-action-status-${status}`)).toBeInTheDocument();
          });

          act(() => {
            userEvent.click(result.getByTestId(`cases-bulk-action-status-${status}`));
          });

          await waitForComponentToUpdate();

          expect(updateCasesSpy).toBeCalledWith(
            useGetCasesMockState.data.cases.map(({ id, version }) => ({
              id,
              version,
              status,
            })),
            expect.anything()
          );
        }
      );

      it.each([
        [CaseSeverity.LOW],
        [CaseSeverity.MEDIUM],
        [CaseSeverity.HIGH],
        [CaseSeverity.CRITICAL],
      ])('Bulk update severity: %s', async (severity) => {
        const result = appMockRenderer.render(<AllCasesList />);

        await waitForComponentToUpdate();

        act(() => {
          userEvent.click(result.getByTestId('checkboxSelectAll'));
        });

        act(() => {
          userEvent.click(result.getByText('Bulk actions'));
        });

        await waitForEuiPopoverOpen();

        act(() => {
          userEvent.click(result.getByTestId('case-bulk-action-severity'));
        });

        await waitFor(() => {
          expect(result.getByTestId(`cases-bulk-action-severity-${severity}`)).toBeInTheDocument();
        });

        act(() => {
          userEvent.click(result.getByTestId(`cases-bulk-action-severity-${severity}`));
        });

        await waitForComponentToUpdate();
      
        await waitFor(() => {
          expect(updateCasesSpy).toBeCalledWith(
            useGetCasesMockState.data.cases.map(({ id, version }) => ({
              id,
              version,
              severity,
            })),
            expect.anything()
          )
        });
      });

      it('Bulk delete', async () => {
        const result = appMockRenderer.render(<AllCasesList />);

        await waitForComponentToUpdate();

        act(() => {
          userEvent.click(result.getByTestId('checkboxSelectAll'));
        });

        act(() => {
          userEvent.click(result.getByText('Bulk actions'));
        });

        await waitForEuiPopoverOpen();

        act(() => {
          userEvent.click(result.getByTestId('cases-bulk-action-delete'), undefined, {
            skipPointerEventsCheck: true,
          });
        });

        await waitFor(() => {
          expect(result.getByTestId('confirm-delete-case-modal')).toBeInTheDocument();
        });

        act(() => {
          userEvent.click(result.getByTestId('confirmModalConfirmButton'));
        });

        await waitFor(() => {
          expect(deleteCasesSpy).toHaveBeenCalledWith(
            [
              'basic-case-id',
              '1',
              '2',
              '3',
              '4',
              'case-with-alerts-id',
              'case-with-alerts-syncoff-id',
              'case-with-registered-attachment',
            ],
            expect.anything()
          );
        });
      });

      it('should disable the checkboxes when the user has read only permissions', async () => {
        appMockRenderer = createAppMockRenderer({ permissions: readCasesPermissions() });
        const res = appMockRenderer.render(<AllCasesList />);

        await waitForComponentToUpdate();

        expect(res.getByTestId('checkboxSelectAll')).toBeDisabled();

        await waitFor(() => {
          for (const theCase of defaultGetCases.data.cases) {
            expect(res.getByTestId(`checkboxSelectRow-${theCase.id}`)).toBeDisabled();
          }
        });
      });
    });

    describe('Row actions', () => {
      const statusTests: CaseStatuses[][] = [
        [CaseStatuses.open],
        [CaseStatuses['in-progress']],
        [CaseStatuses.closed],
      ];

      const severityTests: CaseSeverity[][] = [
        [CaseSeverity.LOW],
        [CaseSeverity.MEDIUM],
        [CaseSeverity.HIGH],
        [CaseSeverity.CRITICAL],
      ];

      it('should render row actions', async () => {
        const res = appMockRenderer.render(<AllCasesList />);

        await waitFor(() => {
          for (const theCase of defaultGetCases.data.cases) {
            expect(res.getByTestId(`case-action-popover-button-${theCase.id}`)).toBeInTheDocument();
          }
        });
      });

      it.each(statusTests)('update the status of a case: %s', async (status) => {
        const res = appMockRenderer.render(<AllCasesList />);
        const openCase = useGetCasesMockState.data.cases[0];
        const inProgressCase = useGetCasesMockState.data.cases[1];
        const theCase = status === CaseStatuses.open ? inProgressCase : openCase;

        await waitForComponentToUpdate();

        await waitFor(() => {
          expect(res.getByTestId(`case-action-popover-button-${theCase.id}`)).toBeInTheDocument();
        });

        act(() => {
          userEvent.click(res.getByTestId(`case-action-popover-button-${theCase.id}`));
        });

        await waitFor(() => {
          expect(res.getByTestId(`case-action-status-panel-${theCase.id}`)).toBeInTheDocument();
        });

        act(() => {
          userEvent.click(res.getByTestId(`case-action-status-panel-${theCase.id}`), undefined, {
            skipPointerEventsCheck: true,
          });
        });

        await waitFor(() => {
          expect(res.getByTestId(`cases-bulk-action-status-${status}`)).toBeInTheDocument();
        });

        act(() => {
          userEvent.click(res.getByTestId(`cases-bulk-action-status-${status}`));
        });

        await waitFor(() => {
          expect(updateCasesSpy).toHaveBeenCalledWith(
            [{ id: theCase.id, status, version: theCase.version }],
            expect.anything()
          );
        });
      });

      it.each(severityTests)('update the severity of a case: %s', async (severity) => {
        const res = appMockRenderer.render(<AllCasesList />);
        const lowCase = useGetCasesMockState.data.cases[0];
        const mediumCase = useGetCasesMockState.data.cases[1];
        const theCase = severity === CaseSeverity.LOW ? mediumCase : lowCase;

        await waitForComponentToUpdate();

        await waitFor(() => {
          expect(res.getByTestId(`case-action-popover-button-${theCase.id}`)).toBeInTheDocument();
        });

        act(() => {
          userEvent.click(res.getByTestId(`case-action-popover-button-${theCase.id}`));
        });

        await waitFor(() => {
          expect(res.getByTestId(`case-action-severity-panel-${theCase.id}`)).toBeInTheDocument();
        });

        act(() => {
          userEvent.click(res.getByTestId(`case-action-severity-panel-${theCase.id}`), undefined, {
            skipPointerEventsCheck: true,
          });
        });

        await waitFor(() => {
          expect(res.getByTestId(`cases-bulk-action-severity-${severity}`)).toBeInTheDocument();
        });

        act(() => {
          userEvent.click(res.getByTestId(`cases-bulk-action-severity-${severity}`));
        });

        await waitFor(() => {
          expect(updateCasesSpy).toHaveBeenCalledWith(
            [{ id: theCase.id, severity, version: theCase.version }],
            expect.anything()
          );
        });
      });

      it('should delete a case', async () => {
        const res = appMockRenderer.render(<AllCasesList />);
        const theCase = defaultGetCases.data.cases[0];

        await waitFor(() => {
          expect(res.getByTestId(`case-action-popover-button-${theCase.id}`)).toBeInTheDocument();
        });

        act(() => {
          userEvent.click(res.getByTestId(`case-action-popover-button-${theCase.id}`));
        });

        await waitFor(() => {
          expect(res.getByTestId('cases-bulk-action-delete')).toBeInTheDocument();
        });

        act(() => {
          userEvent.click(res.getByTestId('cases-bulk-action-delete'), undefined, {
            skipPointerEventsCheck: true,
          });
        });

        await waitFor(() => {
          expect(res.getByTestId('confirm-delete-case-modal')).toBeInTheDocument();
        });

        act(() => {
          userEvent.click(res.getByTestId('confirmModalConfirmButton'));
        });

        await waitFor(() => {
          expect(deleteCasesSpy).toHaveBeenCalledWith(['basic-case-id'], expect.anything());
        });
      });

      it('should disable row actions when bulk selecting all cases', async () => {
        const res = appMockRenderer.render(<AllCasesList />);

        await waitForComponentToUpdate();

        act(() => {
          userEvent.click(res.getByTestId('checkboxSelectAll'));
        });

        await waitFor(() => {
          for (const theCase of defaultGetCases.data.cases) {
            expect(res.getByTestId(`case-action-popover-button-${theCase.id}`)).toBeDisabled();
          }
        });
      });

      it('should disable row actions when selecting a case', async () => {
        const res = appMockRenderer.render(<AllCasesList />);
        const caseToSelect = defaultGetCases.data.cases[0];

        await waitForComponentToUpdate();

        act(() => {
          userEvent.click(res.getByTestId(`checkboxSelectRow-${caseToSelect.id}`));
        });

        await waitFor(() => {
          for (const theCase of defaultGetCases.data.cases) {
            expect(res.getByTestId(`case-action-popover-button-${theCase.id}`)).toBeDisabled();
          }
        });
      });
    });

    // Flaky: https://github.com/elastic/kibana/issues/148490
    describe('Assignees', () => {
      it('should hide the assignees column on basic license', async () => {
        useLicenseMock.mockReturnValue({ isAtLeastPlatinum: () => false });
    
        const result = render(
          <TestProviders>
            <AllCasesList />
          </TestProviders>
        );
    
        await waitFor(() => {
          expect(result.getByTestId('cases-table')).toBeTruthy();
          expect(result.queryAllByTestId('case-table-column-assignee').length).toBe(0);
        });
      });
    
      it('should show the assignees column on platinum license', async () => {
        useLicenseMock.mockReturnValue({ isAtLeastPlatinum: () => true });
    
        const result = render(
          <TestProviders>
            <AllCasesList />
          </TestProviders>
        );
    
        await waitFor(() => {
          expect(result.getByTestId('cases-table')).toBeTruthy();
          expect(result.queryAllByTestId('case-table-column-assignee').length).toBeGreaterThan(0);
        });
      });
    
      it('should hide the assignees filters on basic license', async () => {
        useLicenseMock.mockReturnValue({ isAtLeastPlatinum: () => false });
    
        const result = render(
          <TestProviders>
            <AllCasesList />
          </TestProviders>
        );
    
        await waitFor(() => {
          expect(result.getByTestId('cases-table')).toBeTruthy();
          expect(result.queryAllByTestId('options-filter-popover-button-assignees').length).toBe(0);
        });
      });
    
      it('should show the assignees filters on platinum license', async () => {
        useLicenseMock.mockReturnValue({ isAtLeastPlatinum: () => true });
    
        const result = render(
          <TestProviders>
            <AllCasesList />
          </TestProviders>
        );
    
        await waitFor(() => {
          expect(result.getByTestId('cases-table')).toBeTruthy();
          expect(
            result.queryAllByTestId('options-filter-popover-button-assignees').length
          ).toBeGreaterThan(0);
        });
      });
    });
  });
});
