/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { shallowWithIntl, mountWithIntl } from 'test_utils/enzyme_helpers';
import { AddFilterButton } from '../add_filter_btn';
import { EuiButtonEmpty, EuiContextMenuItem } from '@elastic/eui';

describe('AddFilterButton component', () => {
  it('provides all filter choices', () => {
    const component = shallowWithIntl(
      <AddFilterButton newFilters={[]} onNewFilter={jest.fn()} alertFilters={{}} />
    );
    expect(component).toMatchInlineSnapshot(`
      <EuiPopover
        anchorPosition="downLeft"
        button={
          <EuiButtonEmpty
            data-test-subj="uptimeCreateAlertAddFilter"
            disabled={false}
            iconType="plusInCircleFilled"
            onClick={[Function]}
          >
            Add filter
          </EuiButtonEmpty>
        }
        closePopover={[Function]}
        display="inlineBlock"
        hasArrow={true}
        id="singlePanel"
        isOpen={false}
        ownFocus={false}
        panelPaddingSize="none"
      >
        <EuiContextMenuPanel
          hasFocus={true}
          items={
            Array [
              <EuiContextMenuItem
                data-test-subj="uptimeAlertAddFilter.observer.geo.name"
                onClick={[Function]}
              >
                Location
              </EuiContextMenuItem>,
              <EuiContextMenuItem
                data-test-subj="uptimeAlertAddFilter.tags"
                onClick={[Function]}
              >
                Tag
              </EuiContextMenuItem>,
              <EuiContextMenuItem
                data-test-subj="uptimeAlertAddFilter.url.port"
                onClick={[Function]}
              >
                Port
              </EuiContextMenuItem>,
              <EuiContextMenuItem
                data-test-subj="uptimeAlertAddFilter.monitor.type"
                onClick={[Function]}
              >
                Type
              </EuiContextMenuItem>,
            ]
          }
        />
      </EuiPopover>
    `);
  });

  it('excludes filters that already have selected values', () => {
    const component = shallowWithIntl(
      <AddFilterButton
        newFilters={['observer.geo.name', 'tags']}
        alertFilters={{ 'url.port': ['443', '80'] }}
        onNewFilter={jest.fn()}
      />
    );
    expect(component).toMatchInlineSnapshot(`
      <EuiPopover
        anchorPosition="downLeft"
        button={
          <EuiButtonEmpty
            data-test-subj="uptimeCreateAlertAddFilter"
            disabled={false}
            iconType="plusInCircleFilled"
            onClick={[Function]}
          >
            Add filter
          </EuiButtonEmpty>
        }
        closePopover={[Function]}
        display="inlineBlock"
        hasArrow={true}
        id="singlePanel"
        isOpen={false}
        ownFocus={false}
        panelPaddingSize="none"
      >
        <EuiContextMenuPanel
          hasFocus={true}
          items={
            Array [
              <EuiContextMenuItem
                data-test-subj="uptimeAlertAddFilter.monitor.type"
                onClick={[Function]}
              >
                Type
              </EuiContextMenuItem>,
            ]
          }
        />
      </EuiPopover>
    `);
  });

  it('popover is disabled if no values are available', () => {
    const component = shallowWithIntl(
      <AddFilterButton
        newFilters={[]}
        alertFilters={{
          'observer.geo.name': ['fairbanks'],
          tags: ['foo'],
          'url.port': ['80'],
          'monitor.type': ['http'],
        }}
        onNewFilter={jest.fn()}
      />
    );
    expect(component).toMatchInlineSnapshot(`
      <EuiPopover
        anchorPosition="downLeft"
        button={
          <EuiButtonEmpty
            data-test-subj="uptimeCreateAlertAddFilter"
            disabled={true}
            iconType="plusInCircleFilled"
            onClick={[Function]}
          >
            Add filter
          </EuiButtonEmpty>
        }
        closePopover={[Function]}
        display="inlineBlock"
        hasArrow={true}
        id="singlePanel"
        isOpen={false}
        ownFocus={false}
        panelPaddingSize="none"
      >
        <EuiContextMenuPanel
          hasFocus={true}
          items={Array []}
        />
      </EuiPopover>
    `);
  });

  it('filter select', () => {
    const mockOnNewFilter = jest.fn();
    const component = mountWithIntl(
      <AddFilterButton newFilters={[]} alertFilters={{}} onNewFilter={mockOnNewFilter} />
    );
    component.find(EuiButtonEmpty).simulate('click', { target: { value: '0' } });
    component
      .find(EuiContextMenuItem)
      .first()
      .simulate('click', { target: { value: '0' } });
    expect(mockOnNewFilter).toHaveBeenCalled();
    expect(mockOnNewFilter.mock.calls).toMatchInlineSnapshot(`
      Array [
        Array [
          "observer.geo.name",
        ],
      ]
    `);
  });
});
