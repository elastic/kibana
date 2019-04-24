/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, useState } from 'react';

import {
  EuiButton,
  EuiButtonIcon,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiFormRow,
  EuiListGroup,
  EuiListGroupItem,
  EuiPanel,
  EuiPopover,
  EuiSpacer,
} from '@elastic/eui';

import { PivotGroupByConfig, PivotGroupByConfigDict } from '../../common';

interface PopoverFormProps {
  interval: string;
  onChange(interval: string): void;
}

const PopoverForm: React.SFC<PopoverFormProps> = ({ interval, onChange }) => {
  const [editedInterval, setInterval] = useState(interval);
  return (
    <EuiForm>
      <EuiFlexGroup>
        <EuiFlexItem grow={false} style={{ width: 100 }}>
          <EuiFormRow label="Interval">
            <EuiFieldText
              defaultValue={editedInterval}
              onChange={e => setInterval(e.target.value)}
            />
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFormRow hasEmptyLabelSpace>
            <EuiButton onClick={() => onChange(editedInterval)}>Save</EuiButton>
          </EuiFormRow>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiForm>
  );
};

interface GroupByLabelProps {
  item: PivotGroupByConfig;
  optionsDataId: string;
  deleteHandler(l: string): void;
  onChange(id: string, item: PivotGroupByConfig): void;
}

const GroupByLabel: React.SFC<GroupByLabelProps> = ({
  deleteHandler,
  item,
  onChange,
  optionsDataId,
}) => {
  const [isPopoverVisible, setPopoverVisibility] = useState(false);

  function updateInterval(interval: string) {
    if ('interval' in item) {
      item.interval = interval;
      onChange(optionsDataId, item);
      setPopoverVisibility(false);
    }
  }

  return 'interval' in item ? (
    <EuiFlexGroup alignItems="center" gutterSize="s">
      <EuiFlexItem>{optionsDataId}</EuiFlexItem>
      <EuiFlexItem grow={false} style={{ color: '#999' }}>
        {item.interval}
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiPopover
          id="mlIntervalFormPopover"
          ownFocus
          button={
            <EuiButtonIcon
              aria-label="Edit interval"
              style={{ padding: 0, minWidth: '0', minHeight: '0' }}
              size="s"
              iconType="pencil"
              onClick={() => setPopoverVisibility(!isPopoverVisible)}
            />
          }
          isOpen={isPopoverVisible}
          closePopover={() => setPopoverVisibility(false)}
        >
          <PopoverForm interval={item.interval} onChange={updateInterval} />
        </EuiPopover>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiButtonIcon
          aria-label="Delete item"
          style={{ padding: 0, minWidth: '0', minHeight: '0' }}
          size="s"
          iconType="cross"
          onClick={() => deleteHandler(optionsDataId)}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  ) : (
    <EuiFlexGroup alignItems="center" gutterSize="s">
      <EuiFlexItem>{optionsDataId}</EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiButtonIcon
          aria-label="Delete item"
          style={{ padding: 0, minWidth: '0', minHeight: '0' }}
          size="s"
          iconType="cross"
          onClick={() => deleteHandler(optionsDataId)}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

interface ListProps {
  list: PivotGroupByConfigDict;
  deleteHandler(l: string): void;
  onChange(id: string, item: PivotGroupByConfig): void;
}

export const GroupByListForm: React.SFC<ListProps> = ({ deleteHandler, list, onChange }) => {
  const listKeys = Object.keys(list);
  return (
    <EuiListGroup flush={true}>
      {listKeys.map((optionsDataId: string) => {
        return (
          <Fragment key={optionsDataId}>
            <EuiPanel paddingSize="s">
              <EuiListGroupItem
                label={
                  <GroupByLabel
                    deleteHandler={deleteHandler}
                    item={list[optionsDataId]}
                    onChange={onChange}
                    optionsDataId={optionsDataId}
                  />
                }
                style={{ padding: 0, display: 'block', width: '100%' }}
              />
            </EuiPanel>
            {listKeys.length > 0 && <EuiSpacer size="s" />}
          </Fragment>
        );
      })}
    </EuiListGroup>
  );
};
