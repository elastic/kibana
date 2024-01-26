/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiListGroup,
  EuiListGroupItem,
  EuiListGroupItemProps,
  EuiListGroupProps,
} from '@elastic/eui';
import { createAllLogDatasetsItem } from '../utils';
import { showAllLogsLabel } from '../constants';

type DatasetsAllActionProps = EuiListGroupProps;

interface ShowAllLogsProps extends Omit<EuiListGroupItemProps, 'label'> {
  isSelected: boolean;
  onClick(): void;
}

export const SelectorActions = (props: DatasetsAllActionProps) => {
  return <EuiListGroup flush size="s" {...props} />;
};

const ShowAllLogs = ({ isSelected, onClick, ...props }: ShowAllLogsProps) => {
  const allLogs = createAllLogDatasetsItem();

  return (
    <EuiListGroupItem
      data-test-subj={allLogs['data-test-subj']}
      onClick={onClick}
      iconType={isSelected ? 'check' : allLogs.iconType}
      label={showAllLogsLabel}
      {...props}
    />
  );
};

SelectorActions.Action = EuiListGroupItem;
SelectorActions.ShowAllLogs = ShowAllLogs;
