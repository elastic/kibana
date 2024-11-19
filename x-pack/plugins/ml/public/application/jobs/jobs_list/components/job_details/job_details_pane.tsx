/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React from 'react';
import { css } from '@emotion/react';

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiTitle,
  EuiTable,
  EuiTableBody,
  EuiTableRow,
  EuiTableRowCell,
  EuiSpacer,
  useEuiTheme,
} from '@elastic/eui';

type Item = [string, string];

interface Section {
  id: string;
  title: string;
  titleAction: string;
  position: 'left' | 'right';
  items: Item[];
}

// fix for the annotation label being hidden inside the bounds of the chart container

const SectionItem: FC<{ item: Item }> = ({ item }) => {
  const { euiTheme } = useEuiTheme();
  const fontSize = euiTheme.size.m;

  return (
    <EuiTableRow>
      {item[0] !== '' && (
        <EuiTableRowCell>
          <span css={{ fontSize, fontWeight: 'bold' }}>{item[0]}</span>
        </EuiTableRowCell>
      )}
      <EuiTableRowCell>
        <span css={{ fontSize }}>{item[1]}</span>
      </EuiTableRowCell>
    </EuiTableRow>
  );
};

const Section: FC<{ section: Section }> = ({ section }) => {
  const { euiTheme } = useEuiTheme();
  if (section.items.length === 0) {
    return <div />;
  }

  const cssOverride = css({
    overflow: 'auto',
    padding: `${euiTheme.size.xs} ${euiTheme.size.m}`,
    backgroundColor: euiTheme.colors.lightestShade,
    border: `1px solid ${euiTheme.colors.lightShade}`,
    borderRadius: euiTheme.border.radius.medium,
    margin: `${euiTheme.size.s} 0`,

    '.euiTable': {
      backgroundColor: 'transparent',
    },

    '.euiTableRow:hover': {
      backgroundColor: 'inherit',
    },
    '.euiTableRow:first-child': {
      '.euiTableRowCell': {
        borderTop: 0,
      },
    },
    '.euiTableRow:last-child': {
      '.euiTableRowCell': {
        borderBottom: 0,
      },
    },
  });

  return (
    <>
      <EuiFlexGroup direction="column" gutterSize="none">
        <EuiFlexItem grow={false}>
          <EuiFlexGroup justifyContent="spaceBetween">
            <EuiFlexItem grow={false}>
              <EuiTitle size="xs">
                <h4>{section.title}</h4>
              </EuiTitle>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>{section.titleAction}</EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem>
          <div css={cssOverride} data-test-subj={`mlJobRowDetailsSection-${section.id}`}>
            <EuiTable compressed={true}>
              <EuiTableBody>
                {section.items.map((item, i) => (
                  <SectionItem item={item} key={i} />
                ))}
              </EuiTableBody>
            </EuiTable>
          </div>
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
};

export const JobDetailsPane: FC<{ sections: any[]; 'data-test-subj': string }> = ({
  sections,
  ...props
}) => {
  return (
    <>
      <EuiSpacer size="s" />
      <div data-test-subj={props['data-test-subj']}>
        <EuiFlexGroup>
          <EuiFlexItem>
            {sections
              .filter((s) => s.position === 'left')
              .map((s, i) => (
                <Section section={s} key={i} />
              ))}
          </EuiFlexItem>
          <EuiFlexItem>
            {sections
              .filter((s) => s.position === 'right')
              .map((s, i) => (
                <Section section={s} key={i} />
              ))}
          </EuiFlexItem>
        </EuiFlexGroup>
      </div>
    </>
  );
};
