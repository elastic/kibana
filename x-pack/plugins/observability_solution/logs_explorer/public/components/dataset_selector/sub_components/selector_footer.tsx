/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiBetaBadge,
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiListGroupProps,
  EuiPanel,
} from '@elastic/eui';
import { getRouterLinkProps } from '@kbn/router-utils';
import { DiscoverEsqlUrlProps } from '../../../hooks/use_esql';
import { createAllLogDatasetsItem } from '../utils';
import { showAllLogsLabel, tryEsql } from '../constants';

type DatasetsAllActionProps = EuiListGroupProps;

interface ShowAllLogsProps {
  isSelected: boolean;
  onClick(): void;
}

export const SelectorFooter = (props: DatasetsAllActionProps) => {
  return (
    <EuiPanel paddingSize="s" hasShadow={false} data-test-subj="datasetSelectorSearchFooter">
      <EuiFlexGroup justifyContent="spaceBetween" alignItems="center" {...props} />
    </EuiPanel>
  );
};

export const ShowAllLogsButton = ({ isSelected, onClick }: ShowAllLogsProps) => {
  const allLogs = createAllLogDatasetsItem();

  return (
    <EuiFlexItem grow={false}>
      <EuiButtonEmpty
        data-test-subj={allLogs['data-test-subj']}
        onClick={onClick}
        size="s"
        iconType={isSelected ? 'check' : allLogs.iconType}
        flush="left"
      >
        {showAllLogsLabel}
      </EuiButtonEmpty>
    </EuiFlexItem>
  );
};

export const ESQLButton = (props: DiscoverEsqlUrlProps) => {
  const linkProps = getRouterLinkProps(props);

  return (
    <EuiFlexItem grow={false}>
      <EuiButton
        {...linkProps}
        iconType={() => (
          <EuiBetaBadge
            label="ESQL Beta"
            color="hollow"
            iconType="beaker"
            size="s"
            alignment="middle"
          />
        )}
        iconSide="right"
        color="success"
        size="s"
        data-test-subj="esqlLink"
      >
        {tryEsql}
      </EuiButton>
    </EuiFlexItem>
  );
};
