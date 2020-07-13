/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiTitle } from '@elastic/eui';
import { VisitorBreakdownChart } from '../Charts/VisitorBreakdownChart';
import { VisitorBreakdownLabel } from '../translations';
import { LocalUIFilter } from '../../../../../typings/ui_filters';

interface Props {
  filters: LocalUIFilter[];
}

export const VisitorBreakdown = ({ filters = [] }: Props) => {
  const os = filters?.find(({ name }) => name === 'os');
  const device = filters?.find(({ name }) => name === 'device');
  const browser = filters?.find(({ name }) => name === 'browser');

  return (
    <>
      <EuiTitle size="xs">
        <h3>{VisitorBreakdownLabel}</h3>
      </EuiTitle>
      <EuiFlexGroup>
        <EuiFlexItem>
          <VisitorBreakdownChart data={browser} />
          <EuiTitle size="xs" className="eui-textCenter">
            <h4>Browser</h4>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem>
          <VisitorBreakdownChart data={os} />
          <EuiTitle size="xs" className="eui-textCenter">
            <h4>Operating System</h4>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem>
          <VisitorBreakdownChart data={device} />
          <EuiTitle size="xs" className="eui-textCenter">
            <h4>Device</h4>
          </EuiTitle>
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
};
