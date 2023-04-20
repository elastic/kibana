/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FilterGroup } from '..';
import type { FC } from 'react';
import React, { useState, useEffect, useImperativeHandle, forwardRef } from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { DEFAULT_DETECTION_PAGE_FILTERS } from '../../../../../common/constants';
import { TestProviders } from '../../../mock';
import type {
  AwaitingControlGroupAPI,
  ControlGroupContainer,
  ControlGroupOutput,
  ControlGroupInput,
  ControlGroupRendererProps,
  ControlGroupInputBuilder,
} from '@kbn/controls-plugin/public';
import { Subject } from 'rxjs';
import { initialInputData, sampleOutputData } from './mock.data';

jest.mock('../../../hooks/use_space_id', () => {
  return {
    useSpaceId: jest.fn(() => 'test_space_id'),
  };
});

const TEST_IDS = {
  FILTER_CONTROLS: 'filter_group__items',
  FILTER_LOADING: 'filter-group__loading',
  MOCKED_CONTROL: 'mocked_control_group',
  ADD_CONTROL: 'filter-group__add-control',
  SAVE_CONTROL: 'filter-group__save',
  CONTEXT_MENU: {
    BTN: 'filter-group__context',
    MENU: 'filter-group__context-menu',
    RESET: 'filter-group__context--reset',
    EDIT: 'filter_group__context--edit',
    DISCARD: `filter_group__context--discard`,
  },
};

const controlGroupFilterOutput$ = new Subject<ControlGroupOutput>();

const controlGroupFilterInput$ = new Subject<ControlGroupInput>();

const getInput$Mock = jest.fn(() => controlGroupFilterInput$);

const getOutput$Mock = jest.fn(() => controlGroupFilterOutput$);

const controlGroupMock = {
  reload: jest.fn(),
  getInput: jest.fn().mockReturnValue({
    viewMode: 'VIEW',
  }),
  updateInput: jest.fn(),
  getOutput$: getOutput$Mock,
  getInput$: getInput$Mock,
  openAddDataControlFlyout: jest.fn(),
  addOptionsListControl: jest.fn(),
};

const updateControlGroupInputMock = (newInput: ControlGroupInput) => {
  controlGroupFilterInput$.next(newInput);
  controlGroupMock.getInput.mockReturnValue(newInput);
};

const updateControlGroupOutputMock = (newOutput: ControlGroupOutput) => {
  controlGroupFilterOutput$.next(newOutput);
};

const MockedControlGroupRenderer: FC<ControlGroupRendererProps> = forwardRef<
  AwaitingControlGroupAPI,
  ControlGroupRendererProps
>(({ getCreationOptions }, ref) => {
  useImperativeHandle(ref, () => controlGroupMock as unknown as ControlGroupContainer);
  const [creationOptionsCalled, setCreationOptionsCalled] = useState(false);

  useEffect(() => {
    if (creationOptionsCalled) return;
    setCreationOptionsCalled(true);
    if (getCreationOptions) {
      getCreationOptions({}, {
        addOptionsListControl: controlGroupMock.addOptionsListControl,
      } as unknown as ControlGroupInputBuilder);
    }
  }, [getCreationOptions, creationOptionsCalled]);
  return <div data-test-subj={TEST_IDS.MOCKED_CONTROL} />;
});

MockedControlGroupRenderer.displayName = 'MockedControlGroup';

jest.mock('@kbn/controls-plugin/public/control_group/external_api/control_group_renderer', () => {
  const { forwardRef: fR } = jest.requireActual('react');
  // const { ControlGroupRenderer: MockedCGR } = jest.requireActual(
  // '@kbn/controls-plugin/public/control_group/external_api/control_group_renderer'
  // );
  return {
    _esModule: true,
    ControlGroupRenderer: fR((props, ref) => <MockedControlGroupRenderer {...props} ref={ref} />),
  };
});

const onFilterChangeMock = jest.fn();

const TestComponent = () => (
  <TestProviders>
    <FilterGroup
      initialControls={DEFAULT_DETECTION_PAGE_FILTERS}
      dataViewId="security-solution-default"
      chainingSystem="HIERARCHICAL"
      onFilterChange={onFilterChangeMock}
    />
  </TestProviders>
);

const openContextMenu = async () => {
  fireEvent.click(screen.getByTestId(TEST_IDS.CONTEXT_MENU.BTN));

  await waitFor(() => {
    expect(screen.getByTestId(TEST_IDS.CONTEXT_MENU.RESET)).toBeVisible();
  });
};

describe(' Filter Group Component ', () => {
  describe('Basic Functions ', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });
    it('should render', async () => {
      render(<TestComponent />);
      expect(screen.getByTestId(TEST_IDS.MOCKED_CONTROL)).toBeVisible();
      expect(screen.getByTestId(TEST_IDS.FILTER_CONTROLS)).toBeVisible();
    });

    it('should have context menu open when clicked', async () => {
      render(<TestComponent />);

      fireEvent.click(screen.getByTestId(TEST_IDS.CONTEXT_MENU.BTN));

      await waitFor(() => {
        expect(screen.getByTestId(TEST_IDS.CONTEXT_MENU.EDIT)).toBeVisible();
        expect(screen.getByTestId(TEST_IDS.CONTEXT_MENU.RESET)).toBeVisible();
      });
    });

    it('should go into edit model without any issues', async () => {
      render(<TestComponent />);

      updateControlGroupInputMock(initialInputData as ControlGroupInput);

      await openContextMenu();

      fireEvent.click(screen.getByTestId(TEST_IDS.CONTEXT_MENU.EDIT));
      await waitFor(() => {
        expect(screen.getByTestId(TEST_IDS.ADD_CONTROL)).toBeVisible();
        expect(screen.getByTestId(TEST_IDS.SAVE_CONTROL)).toBeVisible();
        expect(screen.getByTestId(TEST_IDS.SAVE_CONTROL)).toBeDisabled();
      });
    });

    it('should have add button disable/enable when controls are more/less than max', async () => {
      render(<TestComponent />);

      updateControlGroupInputMock(initialInputData as ControlGroupInput);

      await openContextMenu();

      fireEvent.click(screen.getByTestId(TEST_IDS.CONTEXT_MENU.EDIT));
      await waitFor(() => {
        expect(screen.getByTestId(TEST_IDS.ADD_CONTROL)).toBeDisabled();
      });

      // delete some panels
      const newInputData = {
        ...initialInputData,
        panels: {
          '0': initialInputData.panels['0'],
        },
      } as ControlGroupInput;

      updateControlGroupInputMock(newInputData);

      await waitFor(() => {
        // add button should be enabled now
        expect(screen.getByTestId(TEST_IDS.ADD_CONTROL)).not.toBeDisabled();
        // save button should also be enable since changes have taken place
        expect(screen.getByTestId(TEST_IDS.SAVE_CONTROL)).not.toBeDisabled();
      });
    });

    it('should open flyout when clicked on ADD', async () => {
      render(<TestComponent />);

      updateControlGroupInputMock(initialInputData as ControlGroupInput);

      await openContextMenu();

      fireEvent.click(screen.getByTestId(TEST_IDS.CONTEXT_MENU.EDIT));
      await waitFor(() => {
        expect(screen.getByTestId(TEST_IDS.ADD_CONTROL)).toBeDisabled();
      });

      // delete some panels
      const newInputData = {
        ...initialInputData,
        panels: {
          '0': initialInputData.panels['0'],
        },
      } as ControlGroupInput;

      updateControlGroupInputMock(newInputData);

      await waitFor(() => {
        // add button should be enabled now
        expect(screen.getByTestId(TEST_IDS.ADD_CONTROL)).not.toBeDisabled();
        // save button should also be enable since changes have taken place
        expect(screen.getByTestId(TEST_IDS.SAVE_CONTROL)).not.toBeDisabled();
      });

      fireEvent.click(screen.getByTestId(TEST_IDS.ADD_CONTROL));

      await waitFor(() => {
        expect(controlGroupMock.openAddDataControlFlyout.mock.calls.length).toBe(1);
      });
    });

    it('should save controls successfully', async () => {
      render(<TestComponent />);
      updateControlGroupInputMock(initialInputData as ControlGroupInput);
      await openContextMenu();
      fireEvent.click(screen.getByTestId(TEST_IDS.CONTEXT_MENU.EDIT));

      // modify controls
      const newInputData = {
        ...initialInputData,
        panels: {
          '0': initialInputData.panels['0'],
        },
      } as ControlGroupInput;

      updateControlGroupInputMock(newInputData);

      // clear any previous calls to the API
      controlGroupMock.addOptionsListControl.mockClear();

      fireEvent.click(screen.getByTestId(TEST_IDS.SAVE_CONTROL));

      await waitFor(() => {
        // edit model gone
        expect(screen.queryAllByTestId(TEST_IDS.SAVE_CONTROL)).toHaveLength(0);

        // check if upsert was called correctely
        expect(controlGroupMock.addOptionsListControl.mock.calls.length).toBe(1);
        expect(controlGroupMock.addOptionsListControl.mock.calls[0][0]).toMatchObject({
          ...initialInputData.panels['0'].explicitInput,
        });
      });
    });

    it('should add persitable controls back on save, if deleted', async () => {
      render(<TestComponent />);
      updateControlGroupInputMock(initialInputData as ControlGroupInput);

      await openContextMenu();
      fireEvent.click(screen.getByTestId(TEST_IDS.CONTEXT_MENU.EDIT));

      // modify controls
      const newInputData = {
        ...initialInputData,
        panels: {
          // removed persitable control i.e. status at "0" key
          '3': initialInputData.panels['3'],
        },
      } as ControlGroupInput;

      updateControlGroupInputMock(newInputData);

      // clear any previous calls to the API
      controlGroupMock.addOptionsListControl.mockClear();

      fireEvent.click(screen.getByTestId(TEST_IDS.SAVE_CONTROL));

      await waitFor(() => {
        // edit model gone
        expect(screen.queryAllByTestId(TEST_IDS.SAVE_CONTROL)).toHaveLength(0);
        // check if upsert was called correctely
        expect(controlGroupMock.addOptionsListControl.mock.calls.length).toBe(2);
        expect(controlGroupMock.addOptionsListControl.mock.calls[0][0]).toMatchObject({
          hideExclude: true,
          hideSort: true,
          hidePanelTitles: true,
          placeholder: '',
          ...DEFAULT_DETECTION_PAGE_FILTERS[0],
        });
        expect(controlGroupMock.addOptionsListControl.mock.calls[1][0]).toMatchObject({
          ...initialInputData.panels['3'].explicitInput,
        });
      });
    });

    it('should call onFilterChange when new filters have been published', async () => {
      render(<TestComponent />);
      updateControlGroupInputMock(initialInputData as ControlGroupInput);
      updateControlGroupOutputMock(sampleOutputData);
      await waitFor(() => {
        expect(onFilterChangeMock.mock.calls.length).toBe(1);
        expect(onFilterChangeMock.mock.calls[0][0]).toMatchObject(sampleOutputData.filters);
      });

      // updating output should call filter change again with different output
      const changedOutput = { ...sampleOutputData, filters: [] };
      updateControlGroupOutputMock(changedOutput);
      await waitFor(() => {
        expect(onFilterChangeMock.mock.calls[1][0]).toMatchObject(changedOutput.filters);
      });
    });

    it('should have Context menu changed when pending changes', async () => {
      render(<TestComponent />);

      updateControlGroupInputMock(initialInputData as ControlGroupInput);

      await openContextMenu();

      fireEvent.click(screen.getByTestId(TEST_IDS.CONTEXT_MENU.EDIT));

      // delete some panels
      const newInputData = {
        ...initialInputData,
        panels: {
          '0': initialInputData.panels['0'],
        },
      } as ControlGroupInput;

      updateControlGroupInputMock(newInputData);

      await openContextMenu();

      await waitFor(() => {
        expect(screen.getByTestId(TEST_IDS.CONTEXT_MENU.DISCARD)).toBeVisible();
      });
    });

    it('should be able to discard changes', async () => {
      render(<TestComponent />);

      updateControlGroupInputMock(initialInputData as ControlGroupInput);

      await openContextMenu();

      fireEvent.click(screen.getByTestId(TEST_IDS.CONTEXT_MENU.EDIT));

      // delete some panels
      const newInputData = {
        ...initialInputData,
        panels: {
          '0': initialInputData.panels['0'],
        },
      } as ControlGroupInput;

      updateControlGroupInputMock(newInputData);

      await openContextMenu();

      await waitFor(() => {
        expect(screen.getByTestId(TEST_IDS.CONTEXT_MENU.DISCARD)).toBeVisible();
      });

      controlGroupMock.updateInput.mockClear();
      fireEvent.click(screen.getByTestId(TEST_IDS.CONTEXT_MENU.DISCARD));

      expect(controlGroupMock.updateInput).toHaveBeenCalled();
      expect(controlGroupMock.updateInput.mock.calls.length).toBe(2);
      // discard changes
      expect(controlGroupMock.updateInput.mock.calls[0][0]).toMatchObject({
        panels: initialInputData.panels,
      });

      // shift to view mode
      expect(controlGroupMock.updateInput.mock.calls[1][0]).toMatchObject({
        viewMode: 'view',
      });
    });
  });
});
