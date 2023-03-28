/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiAccordion, EuiTitle } from '@elastic/eui';
import type { FC } from 'react';
import React from 'react';
import { INSIGHTS_TEST_ID } from './test_ids';
import { INSIGHTS_TITLE } from './translations';
import { useRightPanelContext } from '../context';
import type { OverviewSectionProps } from '../types';
import { Entities } from './entities';

export const Insights: FC<OverviewSectionProps> = ({ expanded = false }) => {
  const { eventId } = useRightPanelContext();

  if (!eventId) {
    return null;
  }

  return (
    <EuiAccordion
      initialIsOpen={expanded}
      data-test-subj={INSIGHTS_TEST_ID}
      id={INSIGHTS_TEST_ID}
      paddingSize="m"
      buttonContent={
        <EuiTitle size="xs">
          <h5>{INSIGHTS_TITLE}</h5>
        </EuiTitle>
      }
    >
      <Entities />
    </EuiAccordion>
  );
};
