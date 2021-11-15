/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FormEvent } from 'react';
import { mountWithIntl } from '@kbn/test/jest';
import { DataTableToolbar } from './toolbar';
import { DatatableVisualizationState } from '../visualization';
import { FramePublicAPI, VisualizationToolbarProps } from '../../types';
import { ToolbarButton } from 'src/plugins/kibana_react/public';
import { ReactWrapper } from 'enzyme';

class Harness {
  wrapper: ReactWrapper;

  constructor(wrapper: ReactWrapper) {
    this.wrapper = wrapper;
  }

  togglePopover() {
    this.wrapper.find(ToolbarButton).simulate('click');
  }

  public get fitRowToContentSwitch() {
    return this.wrapper.find('EuiSwitch[data-test-subj="lens-legend-auto-height-switch"]');
  }

  toggleFitRowToContent() {
    this.fitRowToContentSwitch.prop('onChange')!({} as FormEvent);
  }

  public get paginationSwitch() {
    return this.wrapper.find('EuiSwitch[data-test-subj="lens-table-pagination-switch"]');
  }

  togglePagination() {
    this.paginationSwitch.prop('onChange')!({} as FormEvent);
  }
}

describe('datatable toolbar', () => {
  let harness: Harness;
  let defaultProps: VisualizationToolbarProps<DatatableVisualizationState>;

  beforeEach(() => {
    defaultProps = {
      setState: jest.fn(),
      frame: {} as FramePublicAPI,
      state: {
        fitRowToContent: false,
        enablePagination: false,
      } as DatatableVisualizationState,
    };

    harness = new Harness(mountWithIntl(<DataTableToolbar {...defaultProps} />));
  });

  it('should reflect state in the UI', async () => {
    harness.togglePopover();

    expect(harness.fitRowToContentSwitch.prop('checked')).toBe(false);
    expect(harness.paginationSwitch.prop('checked')).toBe(false);

    harness.wrapper.setProps({ state: { fitRowToContent: true, enablePagination: true } });

    expect(harness.fitRowToContentSwitch.prop('checked')).toBe(true);
    expect(harness.paginationSwitch.prop('checked')).toBe(true);
  });

  it('should toggle fit-row-to-content', async () => {
    harness.togglePopover();

    harness.toggleFitRowToContent();

    expect(defaultProps.setState).toHaveBeenCalledTimes(1);
    expect(defaultProps.setState).toHaveBeenNthCalledWith(1, {
      fitRowToContent: true,
      enablePagination: false,
    });

    harness.wrapper.setProps({ state: { fitRowToContent: true, enablePagination: false } }); // update state manually
    harness.toggleFitRowToContent(); // turn it off

    expect(defaultProps.setState).toHaveBeenCalledTimes(2);
    expect(defaultProps.setState).toHaveBeenNthCalledWith(2, {
      fitRowToContent: false,
      enablePagination: false,
    });
  });

  it('should toggle table pagination', async () => {
    harness.togglePopover();

    harness.togglePagination();

    expect(defaultProps.setState).toHaveBeenCalledTimes(1);
    expect(defaultProps.setState).toHaveBeenNthCalledWith(1, {
      enablePagination: true,
      fitRowToContent: false,
    });

    harness.wrapper.setProps({ state: { fitRowToContent: false, enablePagination: true } }); // update state manually
    harness.togglePagination(); // turn it off

    expect(defaultProps.setState).toHaveBeenCalledTimes(2);
    expect(defaultProps.setState).toHaveBeenNthCalledWith(2, {
      fitRowToContent: false,
      enablePagination: false,
    });
  });
});
