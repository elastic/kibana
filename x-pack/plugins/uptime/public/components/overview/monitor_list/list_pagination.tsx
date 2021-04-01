/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { OverviewPageLink } from './overview_page_link';

interface Props {
  next: string;
  previous: string;
}

export const ListPagination = ({ next, previous }: Props) => {
  return (
    <EuiFlexGroup responsive={false}>
      <EuiFlexItem grow={false}>
        <OverviewPageLink
          dataTestSubj="xpack.uptime.monitorList.prevButton"
          direction="prev"
          pagination={previous}
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <OverviewPageLink
          dataTestSubj="xpack.uptime.monitorList.nextButton"
          direction="next"
          pagination={next}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
