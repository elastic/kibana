/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { waitForEuiPopoverOpen } from '@elastic/eui/lib/test/rtl';
import { licensingMock } from '@kbn/licensing-plugin/public/mocks';
import { waitForComponentToUpdate } from '../../common/test_utils';

import { CaseStatuses, CustomFieldTypes } from '../../../common/types/domain';
import { SECURITY_SOLUTION_OWNER, OBSERVABILITY_OWNER } from '../../../common/constants';
import type { AppMockRenderer } from '../../common/mock';
import { createAppMockRenderer } from '../../common/mock';
import { DEFAULT_FILTER_OPTIONS } from '../../containers/constants';
import { CasesTableFilters } from './table_filters';
import { useGetTags } from '../../containers/use_get_tags';
import { useGetCategories } from '../../containers/use_get_categories';
import { useSuggestUserProfiles } from '../../containers/user_profiles/use_suggest_user_profiles';
import { userProfiles } from '../../containers/user_profiles/api.mock';
import { getCaseConfigure } from '../../containers/configure/api';
import { CUSTOM_FIELD_KEY_PREFIX } from './table_filter_config/use_custom_fields_filter_config';

jest.mock('../../containers/use_get_tags');
jest.mock('../../containers/use_get_categories');
jest.mock('../../containers/user_profiles/use_suggest_user_profiles');
jest.mock('../../containers/configure/api', () => {
  const originalModule = jest.requireActual('../../containers/configure/api');
  return {
    ...originalModule,
    getCaseConfigure: jest.fn(),
  };
});

const getCaseConfigureMock = getCaseConfigure as jest.Mock;

const onFilterChanged = jest.fn();

const props = {
  countClosedCases: 1234,
  countOpenCases: 99,
  countInProgressCases: 54,
  onFilterChanged,
  filterOptions: DEFAULT_FILTER_OPTIONS,
  availableSolutions: [],
  isLoading: false,
  initialFilterOptions: DEFAULT_FILTER_OPTIONS,
  currentUserProfile: undefined,
};

describe('CasesTableFilters ', () => {
  let appMockRender: AppMockRenderer;
  // eslint-disable-next-line prefer-object-spread
  const originalGetComputedStyle = Object.assign({}, window.getComputedStyle);

  beforeAll(() => {
    // The JSDOM implementation is too slow
    // Especially for dropdowns that try to position themselves
    // perf issue - https://github.com/jsdom/jsdom/issues/3234
    Object.defineProperty(window, 'getComputedStyle', {
      value: (el: HTMLElement) => {
        /**
         * This is based on the jsdom implementation of getComputedStyle
         * https://github.com/jsdom/jsdom/blob/9dae17bf0ad09042cfccd82e6a9d06d3a615d9f4/lib/jsdom/browser/Window.js#L779-L820
         *
         * It is missing global style parsing and will only return styles applied directly to an element.
         * Will not return styles that are global or from emotion
         */
        const declaration = new CSSStyleDeclaration();
        const { style } = el;

        Array.prototype.forEach.call(style, (property: string) => {
          declaration.setProperty(
            property,
            style.getPropertyValue(property),
            style.getPropertyPriority(property)
          );
        });

        return declaration;
      },
      configurable: true,
      writable: true,
    });
  });

  afterAll(() => {
    Object.defineProperty(window, 'getComputedStyle', originalGetComputedStyle);
  });

  beforeEach(() => {
    appMockRender = createAppMockRenderer();
    (useGetTags as jest.Mock).mockReturnValue({ data: ['coke', 'pepsi'], isLoading: false });
    (useGetCategories as jest.Mock).mockReturnValue({
      data: ['twix', 'snickers'],
      isLoading: false,
    });
    (useSuggestUserProfiles as jest.Mock).mockReturnValue({ data: userProfiles, isLoading: false });
  });

  afterEach(() => {
    jest.clearAllMocks();
    window.localStorage.clear();
  });

  it('should render the case status filter dropdown', () => {
    appMockRender.render(<CasesTableFilters {...props} />);

    expect(screen.getByTestId('options-filter-popover-button-status')).toBeInTheDocument();
  });

  it('should render the case severity filter dropdown', () => {
    appMockRender.render(<CasesTableFilters {...props} />);
    expect(screen.getByTestId('options-filter-popover-button-severity')).toBeTruthy();
  });

  it('should call onFilterChange when the severity filter changes', async () => {
    appMockRender.render(<CasesTableFilters {...props} />);
    userEvent.click(screen.getByTestId('options-filter-popover-button-severity'));
    await waitForEuiPopoverOpen();
    userEvent.click(screen.getByTestId('options-filter-popover-item-high'));

    expect(onFilterChanged).toBeCalledWith({ ...DEFAULT_FILTER_OPTIONS, severity: ['high'] });
  });

  it('should call onFilterChange when selected tags change', async () => {
    appMockRender.render(<CasesTableFilters {...props} />);

    userEvent.click(screen.getByTestId('options-filter-popover-button-tags'));
    await waitForEuiPopoverOpen();
    userEvent.click(screen.getByTestId('options-filter-popover-item-coke'));

    expect(onFilterChanged).toBeCalledWith({ ...DEFAULT_FILTER_OPTIONS, tags: ['coke'] });
  });

  it('should call onFilterChange when selected category changes', async () => {
    appMockRender.render(<CasesTableFilters {...props} />);

    userEvent.click(screen.getByTestId('options-filter-popover-button-category'));
    await waitForEuiPopoverOpen();
    userEvent.click(screen.getByTestId('options-filter-popover-item-twix'));

    expect(onFilterChanged).toBeCalledWith({ ...DEFAULT_FILTER_OPTIONS, category: ['twix'] });
  });

  it('should call onFilterChange when selected assignees change', async () => {
    const license = licensingMock.createLicense({
      license: { type: 'platinum' },
    });

    appMockRender = createAppMockRenderer({ license });

    const { getByTestId, getByText } = appMockRender.render(<CasesTableFilters {...props} />);
    userEvent.click(getByTestId('options-filter-popover-button-assignees'));
    await waitForEuiPopoverOpen();

    userEvent.click(getByText('Physical Dinosaur'));

    expect(onFilterChanged.mock.calls[0][0]).toMatchInlineSnapshot(`
      Object {
        "assignees": Array [
          "u_A_tM4n0wPkdiQ9smmd8o0Hr_h61XQfu8aRPh9GMoRoc_0",
        ],
      }
    `);
  });

  it('should call onFilterChange when search changes', async () => {
    appMockRender.render(<CasesTableFilters {...props} />);

    userEvent.type(screen.getByTestId('search-cases'), 'My search{enter}');

    expect(onFilterChanged).toBeCalledWith({ search: 'My search' });
  });

  it('should call onFilterChange when changing status', async () => {
    appMockRender.render(<CasesTableFilters {...props} />);

    userEvent.click(screen.getByTestId('options-filter-popover-button-status'));
    await waitForEuiPopoverOpen();
    userEvent.click(screen.getByTestId('options-filter-popover-item-closed'));

    expect(onFilterChanged).toBeCalledWith({
      ...DEFAULT_FILTER_OPTIONS,
      status: [CaseStatuses.closed],
    });
  });

  it('should show in progress status only when "in p" is searched in the filter', async () => {
    appMockRender.render(<CasesTableFilters {...props} />);

    userEvent.click(screen.getByTestId('options-filter-popover-button-status'));
    await waitForEuiPopoverOpen();

    userEvent.type(screen.getByTestId('status-search-input'), 'in p');

    const allOptions = screen.getAllByRole('option');
    expect(allOptions).toHaveLength(1);
    expect(allOptions[0]).toHaveTextContent('In progress');
  });

  it('should remove assignee from selected assignees when assignee no longer exists', async () => {
    const overrideProps = {
      ...props,
      initial: {
        ...DEFAULT_FILTER_OPTIONS,
        assignees: [
          // invalid profile uid
          '123',
          'u_A_tM4n0wPkdiQ9smmd8o0Hr_h61XQfu8aRPh9GMoRoc_0',
        ],
      },
    };

    const license = licensingMock.createLicense({
      license: { type: 'platinum' },
    });

    appMockRender = createAppMockRenderer({ license });

    appMockRender.render(<CasesTableFilters {...overrideProps} />);
    userEvent.click(screen.getByTestId('options-filter-popover-button-assignees'));
    await waitForEuiPopoverOpen();

    userEvent.click(screen.getByText('Physical Dinosaur'));

    expect(onFilterChanged.mock.calls[0][0]).toMatchInlineSnapshot(`
      Object {
        "assignees": Array [
          "u_A_tM4n0wPkdiQ9smmd8o0Hr_h61XQfu8aRPh9GMoRoc_0",
        ],
      }
    `);
  });

  describe('Solution filter', () => {
    it('shows Solution filter when provided more than 1 availableSolutions', () => {
      appMockRender.render(
        <CasesTableFilters
          {...props}
          availableSolutions={[SECURITY_SOLUTION_OWNER, OBSERVABILITY_OWNER]}
        />
      );
      expect(screen.getByTestId('options-filter-popover-button-owner')).toBeInTheDocument();
    });

    it('does not show Solution filter when provided less than 1 availableSolutions', () => {
      appMockRender.render(
        <CasesTableFilters {...props} availableSolutions={[OBSERVABILITY_OWNER]} />
      );
      expect(screen.queryByTestId('options-filter-popover-button-owner')).not.toBeInTheDocument();
    });

    it('does not select a solution on initial render', () => {
      appMockRender.render(
        <CasesTableFilters
          {...props}
          availableSolutions={[SECURITY_SOLUTION_OWNER, OBSERVABILITY_OWNER]}
        />
      );

      expect(screen.getByTestId('options-filter-popover-button-owner')).not.toHaveAttribute(
        'hasActiveFilters'
      );
    });

    it('should reset the filter setting all available solutions when deactivated', async () => {
      appMockRender.render(
        <CasesTableFilters
          {...props}
          initialFilterOptions={{ owner: [SECURITY_SOLUTION_OWNER, OBSERVABILITY_OWNER] }}
          availableSolutions={[SECURITY_SOLUTION_OWNER, OBSERVABILITY_OWNER]}
        />
      );

      userEvent.click(screen.getByRole('button', { name: 'More' }));
      await waitForEuiPopoverOpen();
      userEvent.click(screen.getByRole('option', { name: 'Solution' }));

      expect(onFilterChanged).toHaveBeenCalledWith({
        ...DEFAULT_FILTER_OPTIONS,
        owner: [SECURITY_SOLUTION_OWNER, OBSERVABILITY_OWNER],
      });
    });
  });

  describe('assignees filter', () => {
    it('should hide the assignees filters on basic license', async () => {
      appMockRender.render(<CasesTableFilters {...props} />);

      expect(screen.queryByTestId('options-filter-popover-button-assignees')).toBeNull();
    });

    it('should show the assignees filters on platinum license', async () => {
      const license = licensingMock.createLicense({
        license: { type: 'platinum' },
      });

      appMockRender = createAppMockRenderer({ license });
      appMockRender.render(<CasesTableFilters {...props} />);

      expect(screen.getByTestId('options-filter-popover-button-assignees')).toBeInTheDocument();
    });
  });

  describe('create case button', () => {
    it('should not render the create case button when isSelectorView is false and onCreateCasePressed are not passed', () => {
      appMockRender.render(<CasesTableFilters {...props} />);
      expect(screen.queryByTestId('cases-table-add-case-filter-bar')).not.toBeInTheDocument();
    });

    it('should render the create case button when isSelectorView is true and onCreateCasePressed are passed', () => {
      const onCreateCasePressed = jest.fn();
      appMockRender.render(
        <CasesTableFilters
          {...props}
          isSelectorView={true}
          onCreateCasePressed={onCreateCasePressed}
        />
      );
      expect(screen.getByTestId('cases-table-add-case-filter-bar')).toBeInTheDocument();
    });

    it('should call the onCreateCasePressed when create case is clicked', async () => {
      const onCreateCasePressed = jest.fn();
      appMockRender.render(
        <CasesTableFilters
          {...props}
          isSelectorView={true}
          onCreateCasePressed={onCreateCasePressed}
        />
      );

      userEvent.click(screen.getByTestId('cases-table-add-case-filter-bar'));

      await waitForComponentToUpdate();
      // NOTE: intentionally checking no arguments are passed
      expect(onCreateCasePressed).toHaveBeenCalledWith();
    });
  });

  describe('toggle type custom field filter', () => {
    const customFieldKey = 'toggleKey';
    const uiCustomFieldKey = `${CUSTOM_FIELD_KEY_PREFIX}${customFieldKey}`;

    beforeEach(() => {
      const previousState = [{ key: uiCustomFieldKey, isActive: true }];
      localStorage.setItem(
        'testAppId.cases.list.tableFiltersConfig',
        JSON.stringify(previousState)
      );
      getCaseConfigureMock.mockImplementation(() => {
        return {
          customFields: [{ type: 'toggle', key: customFieldKey, label: 'Toggle', required: false }],
        };
      });
    });

    afterEach(() => {
      jest.clearAllMocks();
      localStorage.clear();
    });

    it('should render its options', async () => {
      appMockRender.render(<CasesTableFilters {...props} />);

      userEvent.click(await screen.findByRole('button', { name: 'Toggle' }));
      await waitForEuiPopoverOpen();

      const allOptions = screen.getAllByRole('option');
      expect(allOptions).toHaveLength(2);
      expect(allOptions[0]).toHaveTextContent('On');
      expect(allOptions[1]).toHaveTextContent('Off');
    });

    it('should call onFilterChange when On option changes', async () => {
      appMockRender.render(<CasesTableFilters {...props} />);

      userEvent.click(await screen.findByRole('button', { name: 'Toggle' }));
      await waitForEuiPopoverOpen();

      userEvent.click(screen.getByTestId('options-filter-popover-item-on'));

      expect(onFilterChanged).toBeCalledWith({
        ...DEFAULT_FILTER_OPTIONS,
        customFields: {
          [customFieldKey]: {
            type: 'toggle',
            options: ['on'],
          },
        },
      });
    });

    it('should call onFilterChange when Off option changes', async () => {
      appMockRender.render(<CasesTableFilters {...props} />);

      userEvent.click(await screen.findByRole('button', { name: 'Toggle' }));
      await waitForEuiPopoverOpen();

      userEvent.click(screen.getByTestId('options-filter-popover-item-off'));

      expect(onFilterChanged).toBeCalledWith({
        ...DEFAULT_FILTER_OPTIONS,
        customFields: {
          [customFieldKey]: {
            type: 'toggle',
            options: ['off'],
          },
        },
      });
    });

    it('should call onFilterChange when second option is clicked', async () => {
      const customProps = {
        ...props,
        filterOptions: {
          ...props.filterOptions,
          customFields: {
            [customFieldKey]: {
              type: CustomFieldTypes.TOGGLE,
              options: ['on'],
            },
          },
        },
      };
      appMockRender.render(<CasesTableFilters {...customProps} />);

      userEvent.click(await screen.findByRole('button', { name: 'Toggle' }));
      await waitForEuiPopoverOpen();

      userEvent.click(screen.getByTestId('options-filter-popover-item-off'));

      expect(onFilterChanged).toHaveBeenCalledWith({
        ...DEFAULT_FILTER_OPTIONS,
        customFields: {
          [customFieldKey]: {
            type: 'toggle',
            options: ['on', 'off'],
          },
        },
      });
    });

    it('should reset the selected options when a custom field filter is deactivated', async () => {
      const previousState = [{ key: uiCustomFieldKey, isActive: true }];
      localStorage.setItem(
        'testAppId.cases.list.tableFiltersConfig',
        JSON.stringify(previousState)
      );
      const customProps = {
        ...props,
        filterOptions: {
          ...props.filterOptions,
          customFields: {
            [customFieldKey]: {
              type: CustomFieldTypes.TOGGLE,
              options: ['on'],
            },
          },
        },
      };
      appMockRender.render(<CasesTableFilters {...customProps} />);

      userEvent.click(await screen.findByRole('button', { name: 'More' }));
      userEvent.click(await screen.findByRole('option', { name: 'Toggle' }));

      expect(onFilterChanged).toHaveBeenCalledWith({
        ...DEFAULT_FILTER_OPTIONS,
        customFields: {
          [customFieldKey]: {
            type: CustomFieldTypes.TOGGLE,
            options: [],
          },
        },
      });
    });
  });

  describe('custom filters configuration', () => {
    beforeEach(() => {
      getCaseConfigureMock.mockImplementation(() => {
        return {
          customFields: [
            { type: 'toggle', key: 'toggle', label: 'Toggle', required: false },
            { type: 'text', key: 'text', label: 'Text', required: false },
          ],
        };
      });
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    it('shouldnt render the more button when in selector view', async () => {
      appMockRender.render(<CasesTableFilters {...props} isSelectorView />);
      expect(screen.queryByRole('button', { name: 'More' })).not.toBeInTheDocument();
    });

    it('should render all options in the popover, including custom fields', async () => {
      appMockRender.render(<CasesTableFilters {...props} />);

      expect(screen.getByRole('button', { name: 'More' })).toBeInTheDocument();
      userEvent.click(screen.getByRole('button', { name: 'More' }));
      await waitFor(() => expect(screen.getAllByRole('option')).toHaveLength(5));

      expect(screen.getByTestId('options-filter-popover-item-status')).toBeInTheDocument();
      expect(
        screen.getByTestId(`options-filter-popover-item-${CUSTOM_FIELD_KEY_PREFIX}toggle`)
      ).toBeInTheDocument();
    });

    it('should not add text type custom fields', async () => {
      appMockRender.render(<CasesTableFilters {...props} />);

      userEvent.click(screen.getByRole('button', { name: 'More' }));
      await waitForEuiPopoverOpen();

      expect(screen.queryByTestId('options-filter-popover-item-text')).not.toBeInTheDocument();
    });

    it('when a filter gets activated, it should be rendered at the end of the list', async () => {
      appMockRender.render(<CasesTableFilters {...props} />);

      userEvent.click(screen.getByRole('button', { name: 'More' }));
      await waitFor(() => expect(screen.getAllByRole('option')).toHaveLength(5));

      expect(screen.queryByRole('button', { name: 'Toggle' })).not.toBeInTheDocument();
      userEvent.click(screen.getByRole('option', { name: 'Toggle' }));
      expect(screen.getByRole('button', { name: 'Toggle' })).toBeInTheDocument();

      const filterBar = screen.getByTestId('cases-table-filters-group');
      const allFilters = within(filterBar).getAllByRole('button');
      const orderedFilterLabels = ['Severity', 'Status', 'Tags', 'Categories', 'Toggle', 'More'];
      orderedFilterLabels.forEach((label, index) => {
        expect(allFilters[index]).toHaveTextContent(label);
      });
    });

    it('when a filter gets activated, it should be updated in the local storage', async () => {
      appMockRender.render(<CasesTableFilters {...props} />);

      userEvent.click(screen.getByRole('button', { name: 'More' }));
      await waitFor(() => expect(screen.getAllByRole('option')).toHaveLength(5));

      userEvent.click(screen.getByRole('option', { name: 'Toggle' }));
      const storedFilterState = localStorage.getItem('testAppId.cases.list.tableFiltersConfig');
      expect(storedFilterState).toBeTruthy();
      expect(JSON.parse(storedFilterState!)).toMatchInlineSnapshot(`
        Array [
          Object {
            "isActive": true,
            "key": "severity",
          },
          Object {
            "isActive": true,
            "key": "status",
          },
          Object {
            "isActive": true,
            "key": "tags",
          },
          Object {
            "isActive": true,
            "key": "category",
          },
          Object {
            "isActive": true,
            "key": "cf_toggle",
          },
        ]
      `);
    });

    it('when a filter gets deactivated, it should be removed from the list', async () => {
      appMockRender.render(<CasesTableFilters {...props} />);

      userEvent.click(screen.getByRole('button', { name: 'More' }));
      await waitFor(() => expect(screen.getAllByRole('option')).toHaveLength(5));

      expect(screen.getByRole('button', { name: 'Status' })).toBeInTheDocument();
      userEvent.click(screen.getByRole('option', { name: 'Status' }));
      expect(screen.queryByRole('button', { name: 'Status' })).not.toBeInTheDocument();

      const filterBar = screen.getByTestId('cases-table-filters-group');
      const allFilters = within(filterBar).getAllByRole('button');
      const orderedFilterLabels = ['Severity', 'Tags', 'Categories', 'More'];
      orderedFilterLabels.forEach((label, index) => {
        expect(allFilters[index]).toHaveTextContent(label);
      });
    });

    it('should reset the selected options when a system field filter is deactivated', async () => {
      const customProps = {
        ...props,
        filterOptions: {
          ...props.filterOptions,
          status: [CaseStatuses.open],
        },
      };
      appMockRender.render(<CasesTableFilters {...customProps} />);

      userEvent.click(await screen.findByRole('button', { name: 'More' }));
      userEvent.click(await screen.findByRole('option', { name: 'Status' }));

      expect(onFilterChanged).toHaveBeenCalledWith({
        ...DEFAULT_FILTER_OPTIONS,
        status: [],
        customFields: {
          toggle: {
            type: CustomFieldTypes.TOGGLE,
            options: [],
          },
        },
      });
    });

    it('when a filter gets deactivated, it should be updated in the local storage', async () => {
      appMockRender.render(<CasesTableFilters {...props} />);

      userEvent.click(screen.getByRole('button', { name: 'More' }));
      await waitFor(() => expect(screen.getAllByRole('option')).toHaveLength(5));

      userEvent.click(screen.getByRole('option', { name: 'Status' }));

      const storedFilterState = localStorage.getItem('testAppId.cases.list.tableFiltersConfig');
      expect(storedFilterState).toBeTruthy();
      expect(JSON.parse(storedFilterState || '')).toMatchInlineSnapshot(`
        Array [
          Object {
            "isActive": true,
            "key": "severity",
          },
          Object {
            "isActive": false,
            "key": "status",
          },
          Object {
            "isActive": true,
            "key": "tags",
          },
          Object {
            "isActive": true,
            "key": "category",
          },
          Object {
            "isActive": false,
            "key": "cf_toggle",
          },
        ]
      `);
    });

    it('should recover the stored state from the local storage with the right order', async () => {
      const previousState = [
        { key: `${CUSTOM_FIELD_KEY_PREFIX}toggle`, isActive: true },
        { key: 'owner', isActive: false },
        { key: 'category', isActive: false },
        { key: 'tags', isActive: true },
        { key: 'assignee', isActive: false },
        { key: 'status', isActive: false },
        { key: 'severity', isActive: true },
      ];
      localStorage.setItem(
        'testAppId.cases.list.tableFiltersConfig',
        JSON.stringify(previousState)
      );

      appMockRender.render(<CasesTableFilters {...props} />);

      const filterBar = screen.getByTestId('cases-table-filters-group');
      let allFilters: HTMLElement[];
      await waitFor(() => {
        allFilters = within(filterBar).getAllByRole('button');
        expect(allFilters).toHaveLength(4);
      });

      const orderedFilterLabels = ['Toggle', 'Tags', 'Severity', 'More'];
      orderedFilterLabels.forEach((label, index) => {
        expect(allFilters[index]).toHaveTextContent(label);
      });
    });

    it('it should not render a filter that was stored but does not exist anymore', async () => {
      const previousState = [
        { key: 'severity', isActive: true },
        { key: 'status', isActive: false },
        { key: 'fakeField', isActive: true }, // does not exist
        { key: 'tags', isActive: true },
        { key: 'category', isActive: false },
        { key: 'owner', isActive: false },
        { key: `${CUSTOM_FIELD_KEY_PREFIX}toggle`, isActive: true },
      ];
      localStorage.setItem(
        'testAppId.cases.list.tableFiltersConfig',
        JSON.stringify(previousState)
      );

      appMockRender.render(<CasesTableFilters {...props} />);

      const filterBar = screen.getByTestId('cases-table-filters-group');
      let allFilters: HTMLElement[];
      await waitFor(() => {
        allFilters = within(filterBar).getAllByRole('button');
        expect(allFilters).toHaveLength(4);
      });

      const orderedFilterLabels = ['Severity', 'Tags', 'Toggle', 'More'];
      orderedFilterLabels.forEach((label, index) => {
        expect(allFilters[index]).toHaveTextContent(label);
      });
    });

    it('should sort the labels shown in the popover (on equal label, sort by key)', async () => {
      getCaseConfigureMock.mockImplementation(() => {
        return {
          customFields: [
            { type: 'toggle', key: 'za', label: 'ZToggle', required: false },
            { type: 'toggle', key: 'tc', label: 'Toggle', required: false },
            { type: 'toggle', key: 'ta', label: 'Toggle', required: false },
            { type: 'toggle', key: 'tb', label: 'Toggle', required: false },
            { type: 'toggle', key: 'aa', label: 'AToggle', required: false },
          ],
        };
      });
      appMockRender.render(<CasesTableFilters {...props} />);

      userEvent.click(screen.getByRole('button', { name: 'More' }));
      await waitFor(() => {
        expect(screen.getAllByRole('option')).toHaveLength(9);
      });
      const allOptions = screen.getAllByRole('option');
      const orderedKey = [
        `${CUSTOM_FIELD_KEY_PREFIX}aa`,
        'category',
        'severity',
        'status',
        'tags',
        `${CUSTOM_FIELD_KEY_PREFIX}ta`,
        `${CUSTOM_FIELD_KEY_PREFIX}tb`,
        `${CUSTOM_FIELD_KEY_PREFIX}tc`,
        `${CUSTOM_FIELD_KEY_PREFIX}za`,
      ];
      orderedKey.forEach((key, index) => {
        expect(allOptions[index].getAttribute('data-test-subj')).toBe(
          `options-filter-popover-item-${key}`
        );
      });
    });

    it('when a filter is active and isnt last in the list, it should move the filter to last position after deactivating and activating', async () => {
      appMockRender.render(<CasesTableFilters {...props} />);

      const filterBar = screen.getByTestId('cases-table-filters-group');
      let allFilters = within(filterBar).getAllByRole('button');
      let orderedFilterLabels = ['Severity', 'Status', 'Tags', 'Categories', 'More'];
      orderedFilterLabels.forEach((label, index) => {
        expect(allFilters[index]).toHaveTextContent(label);
      });

      expect(screen.getByRole('button', { name: 'Status' })).toBeInTheDocument();
      userEvent.click(screen.getByRole('button', { name: 'More' }));
      userEvent.click(await screen.findByRole('option', { name: 'Status' }));

      userEvent.click(screen.getByRole('button', { name: 'More' }));
      userEvent.click(await screen.findByRole('option', { name: 'Status' }));

      allFilters = within(filterBar).getAllByRole('button');
      orderedFilterLabels = ['Severity', 'Tags', 'Categories', 'Status', 'More'];
      orderedFilterLabels.forEach((label, index) => {
        expect(allFilters[index]).toHaveTextContent(label);
      });
    });

    it('should avoid key collisions between custom fields and default fields', async () => {
      getCaseConfigureMock.mockImplementation(() => {
        return {
          customFields: [
            { type: 'toggle', key: 'severity', label: 'Fake Severity', required: false },
            { type: 'toggle', key: 'status', label: 'Fake Status', required: false },
          ],
        };
      });
      appMockRender.render(<CasesTableFilters {...props} />);

      const filterBar = screen.getByTestId('cases-table-filters-group');
      let allFilters: HTMLElement[];
      await waitFor(() => {
        allFilters = within(filterBar).getAllByRole('button');
        expect(allFilters).toHaveLength(5);
      });

      const orderedFilterLabels = ['Severity', 'Status', 'Tags', 'Categories', 'More'];
      orderedFilterLabels.forEach((label, index) => {
        expect(allFilters[index]).toHaveTextContent(label);
      });

      userEvent.click(screen.getByRole('button', { name: 'More' }));
      let allOptions: HTMLElement[];
      await waitFor(() => {
        allOptions = screen.getAllByRole('option');
        expect(allOptions).toHaveLength(6);
      });
    });

    it('should delete stored filters that dont exist anymore', async () => {
      const previousState = [
        { key: 'severity', isActive: true },
        { key: 'status', isActive: false },
        { key: 'fakeField', isActive: true }, // does not exist, should be removed
        { key: 'tags', isActive: true },
        { key: 'category', isActive: false },
        { key: 'owner', isActive: false }, // isnt available, should be removed
        { key: `${CUSTOM_FIELD_KEY_PREFIX}toggle`, isActive: true },
      ];
      localStorage.setItem(
        'testAppId.cases.list.tableFiltersConfig',
        JSON.stringify(previousState)
      );

      appMockRender.render(<CasesTableFilters {...props} />);

      userEvent.click(screen.getByRole('button', { name: 'More' }));
      // we need any user action to trigger the filter config update
      userEvent.click(await screen.findByRole('option', { name: 'Toggle' }));

      const storedFilterState = localStorage.getItem('testAppId.cases.list.tableFiltersConfig');
      // the fakeField and owner filter should be removed and toggle should update isActive
      expect(JSON.parse(storedFilterState || '')).toMatchInlineSnapshot(`
        Array [
          Object {
            "isActive": true,
            "key": "severity",
          },
          Object {
            "isActive": false,
            "key": "status",
          },
          Object {
            "isActive": true,
            "key": "tags",
          },
          Object {
            "isActive": false,
            "key": "category",
          },
          Object {
            "isActive": false,
            "key": "cf_toggle",
          },
        ]
      `);
    });
  });
});
