/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { ReactNode } from 'react';
import classNames from 'classnames';
import { EuiHighlight, EuiSelectableOption } from '@elastic/eui';
import styled from 'styled-components';
import euiLightVars from '@elastic/eui/dist/eui_theme_light.json';

const StyledSpan = styled.span`
  color: ${euiLightVars.euiColorSecondaryText};
  font-weight: 500;
  :not(:last-of-type)::after {
    content: '•';
    margin: 0 4px;
  }
`;

const StyledListSpan = styled.span`
  display: block;
  margin-top: 4px;
  font-size: 12px;
`;
export type UrlOption<T = { [key: string]: any }> = {
  meta?: string[];
} & EuiSelectableOption<T>;

export const formatOptions = (options: EuiSelectableOption[]) => {
  return options.map((item: EuiSelectableOption) => ({
    title: item.label,
    ...item,
    className: classNames(
      'euiSelectableTemplateSitewide__listItem',
      item.className
    ),
  }));
};

export function selectableRenderOptions(
  option: UrlOption,
  searchValue: string
) {
  return (
    <>
      <EuiHighlight
        className="euiSelectableTemplateSitewide__listItemTitle"
        search={searchValue}
      >
        {option.label}
      </EuiHighlight>
      {renderOptionMeta(option.meta)}
    </>
  );
}

function renderOptionMeta(meta?: string[]): ReactNode {
  if (!meta || meta.length < 1) return;
  return (
    <StyledListSpan>
      {meta.map((item: string) => (
        <StyledSpan key={item}>{item}</StyledSpan>
      ))}
    </StyledListSpan>
  );
}
