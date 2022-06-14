/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiIcon, EuiSpacer, EuiTabbedContent, EuiText } from '@elastic/eui';
import React from 'react';

export const MonitorSummaryTabs = () => {
  const tabs = [
    {
      id: 'summary',
      name: 'Summary',
      content: (
        <>
          <EuiSpacer />
          <EuiText>
            <p>
              Cobalt is a chemical element with symbol Co and atomic number 27. Like nickel, cobalt
              is found in the Earth&rsquo;s crust only in chemically combined form, save for small
              deposits found in alloys of natural meteoric iron. The free element, produced by
              reductive smelting, is a hard, lustrous, silver-gray metal.
            </p>
          </EuiText>
        </>
      ),
    },
    {
      id: 'history',
      name: 'History',
      content: (
        <>
          <EuiSpacer />
          <EuiText>
            <p>
              Intravenous sugar solution, also known as dextrose solution, is a mixture of dextrose
              (glucose) and water. It is used to treat low blood sugar or water loss without
              electrolyte loss.
            </p>
          </EuiText>
        </>
      ),
    },
    {
      id: 'errors',
      name: 'Errors',
      prepend: <EuiIcon type="heatmap" />,
      content: (
        <>
          <EuiSpacer />
          <EuiText>
            <p>
              Hydrogen is a chemical element with symbol H and atomic number 1. With a standard
              atomic weight of 1.008, hydrogen is the lightest element on the periodic table
            </p>
          </EuiText>
        </>
      ),
    },
  ];

  return (
    <EuiTabbedContent
      tabs={tabs}
      initialSelectedTab={tabs[1]}
      autoFocus="selected"
      onTabClick={(tab) => {
        console.log('clicked tab', tab);
      }}
    />
  );
};
