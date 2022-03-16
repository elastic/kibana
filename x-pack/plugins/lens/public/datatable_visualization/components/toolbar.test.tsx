/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { ChangeEvent, FormEvent } from 'react';
import { mountWithIntl } from '@kbn/test-jest-helpers';
import { DataTableToolbar } from './toolbar';
import { DatatableVisualizationState } from '../visualization';
import { FramePublicAPI, VisualizationToolbarProps } from '../../types';
import { ToolbarButton } from 'src/plugins/kibana_react/public';
import { ReactWrapper } from 'enzyme';
import { PagingState } from '../../../common/expressions';
import { EuiButtonGroup, EuiRange } from '@elastic/eui';

// mocking random id generator function
jest.mock('@elastic/eui', () => {
  const original = jest.requireActual('@elastic/eui');

  return {
    ...original,
    htmlIdGenerator: (fn: unknown) => {
      return () => '';
    },
  };
});

class Harness {
  wrapper: ReactWrapper;

  constructor(wrapper: ReactWrapper) {
    this.wrapper = wrapper;
  }

  togglePopover() {
    this.wrapper.find(ToolbarButton).simulate('click');
  }

  public get rowHeight() {
    return this.wrapper.find(EuiButtonGroup);
  }

  changeRowHeight(newMode: 'single' | 'auto' | 'custom') {
    this.rowHeight.prop('onChange')!(newMode);
  }

  public get rowHeightLines() {
    return this.wrapper.find(EuiRange);
  }

  changeRowHeightLines(lineCount: number) {
    this.rowHeightLines.prop('onChange')!(
      {
        currentTarget: { value: lineCount },
      } as unknown as ChangeEvent<HTMLInputElement>,
      true
    );
  }

  public get paginationSwitch() {
    return this.wrapper.find('EuiSwitch[data-test-subj="lens-table-pagination-switch"]');
  }

  togglePagination() {
    this.paginationSwitch.prop('onChange')!({} as FormEvent);
  }
}

describe('datatable toolbar', () => {
  const defaultPagingState: PagingState = {
    size: 10,
    enabled: true,
  };

  let harness: Harness;
  let defaultProps: VisualizationToolbarProps<DatatableVisualizationState>;

  beforeEach(() => {
    defaultProps = {
      setState: jest.fn(),
      frame: {} as FramePublicAPI,
      state: {
        rowHeight: 'single',
      } as DatatableVisualizationState,
    };

    harness = new Harness(mountWithIntl(<DataTableToolbar {...defaultProps} />));
  });

  it('should reflect state in the UI', async () => {
    harness.togglePopover();

    expect(harness.rowHeight.prop('idSelected')).toBe('single');
    expect(harness.paginationSwitch.prop('checked')).toBe(false);

    harness.wrapper.setProps({
      state: {
        rowHeight: 'auto',
        paging: defaultPagingState,
      },
    });

    expect(harness.rowHeight.prop('idSelected')).toBe('auto');
    expect(harness.paginationSwitch.prop('checked')).toBe(true);
  });

  it('should change row height to "Auto" mode', async () => {
    harness.togglePopover();

    harness.changeRowHeight('auto');

    expect(defaultProps.setState).toHaveBeenCalledTimes(1);
    expect(defaultProps.setState).toHaveBeenNthCalledWith(1, {
      rowHeight: 'auto',
      rowHeightLines: undefined,
    });

    harness.wrapper.setProps({ state: { rowHeight: 'auto' } }); // update state manually
    harness.changeRowHeight('single'); // turn it off

    expect(defaultProps.setState).toHaveBeenCalledTimes(2);
    expect(defaultProps.setState).toHaveBeenNthCalledWith(2, {
      rowHeight: 'single',
      rowHeightLines: 1,
    });
  });

  it('should change row height to "Custom" mode', async () => {
    harness.togglePopover();

    harness.changeRowHeight('custom');

    expect(defaultProps.setState).toHaveBeenCalledTimes(1);
    expect(defaultProps.setState).toHaveBeenNthCalledWith(1, {
      rowHeight: 'custom',
      rowHeightLines: 2,
    });

    harness.wrapper.setProps({ state: { rowHeight: 'custom' } }); // update state manually

    expect(harness.rowHeightLines.prop('value')).toBe(2);
  });

  it('should toggle table pagination', async () => {
    harness.togglePopover();

    harness.togglePagination();

    expect(defaultProps.setState).toHaveBeenCalledTimes(1);
    expect(defaultProps.setState).toHaveBeenNthCalledWith(1, {
      paging: defaultPagingState,
      rowHeight: 'single',
    });

    // update state manually
    harness.wrapper.setProps({
      state: { rowHeight: 'single', paging: defaultPagingState },
    });
    harness.togglePagination(); // turn it off. this should disable pagination but preserve the default page size

    expect(defaultProps.setState).toHaveBeenCalledTimes(2);
    expect(defaultProps.setState).toHaveBeenNthCalledWith(2, {
      rowHeight: 'single',
      paging: { ...defaultPagingState, enabled: false },
    });
  });
});
