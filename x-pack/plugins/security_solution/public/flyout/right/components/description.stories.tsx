/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';
import type { Story } from '@storybook/react';
import { Description } from './description';
import { RightPanelContext } from '../context';

const ruleUuid = {
  category: 'kibana',
  field: 'kibana.alert.rule.uuid',
  values: ['123'],
  originalValue: ['123'],
  isObjectArray: false,
};
const ruleDescription = {
  category: 'kibana',
  field: 'kibana.alert.rule.description',
  values: [
    `This is a very long description of the rule. In theory. this description is long enough that it should be cut off when displayed in collapsed mode. If it isn't then there is a problem`,
  ],
  originalValue: ['description'],
  isObjectArray: false,
};

export default {
  component: Description,
  title: 'Flyout/Description',
};

const wrapper = (children: React.ReactNode, panelContextValue: RightPanelContext) => (
  <RightPanelContext.Provider value={panelContextValue}>
    <div
      css={css`
        width: 500px;
      `}
    >
      {children}
    </div>
  </RightPanelContext.Provider>
);
export const RuleExpand: Story<void> = () => {
  const panelContextValue = {
    dataFormattedForFieldBrowser: [ruleUuid, ruleDescription],
  } as unknown as RightPanelContext;

  return wrapper(<Description />, panelContextValue);
};

export const RuleCollapse: Story<void> = () => {
  const panelContextValue = {
    dataFormattedForFieldBrowser: [ruleUuid, ruleDescription],
  } as unknown as RightPanelContext;

  return wrapper(<Description expanded={true} />, panelContextValue);
};

export const Document: Story<void> = () => {
  const panelContextValue = {
    dataFormattedForFieldBrowser: [
      {
        category: 'kibana',
        field: 'kibana.alert.rule.description',
        values: ['This is a description for the document.'],
        originalValue: ['description'],
        isObjectArray: false,
      },
    ],
  } as unknown as RightPanelContext;

  return wrapper(<Description />, panelContextValue);
};

export const EmptyDescription: Story<void> = () => {
  const panelContextValue = {
    dataFormattedForFieldBrowser: [
      ruleUuid,
      {
        category: 'kibana',
        field: 'kibana.alert.rule.description',
        values: [''],
        originalValue: ['description'],
        isObjectArray: false,
      },
    ],
  } as unknown as RightPanelContext;

  return wrapper(<Description expanded={true} />, panelContextValue);
};

export const Empty: Story<void> = () => {
  const panelContextValue = {} as unknown as RightPanelContext;

  return wrapper(<Description expanded={true} />, panelContextValue);
};
