/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import cls from 'classnames';
import styled from 'styled-components';
import { px, unit } from '../../style/variables';

// TODO: replace this component with EUITab w/ a href prop
// as soon as EUI is upgraded to 13.8.1
// see https://github.com/elastic/eui/pull/2275

interface Props {
  isSelected: boolean;
  children: React.ReactNode;
}

// We need to remove padding and add it to the link,
// to prevent the user from clicking in the tab, but outside of the link
// We also need to override the color here to subdue the color of the link
// when not selected

const Wrapper = styled.div<{ isSelected: boolean }>`
  padding: 0;
  a {
    display: inline-block;
    padding: ${px(unit * 0.75)} ${px(unit)};
    ${({ isSelected, theme }) =>
      !isSelected ? `color: ${theme.eui.euiTextColor} !important;` : ''}
  }
`;

const EuiTabLink = (props: Props) => {
  const { isSelected, children } = props;

  const className = cls('euiTab', {
    'euiTab-isSelected': isSelected,
  });

  return (
    <Wrapper className={className} isSelected={isSelected}>
      <span className={'euiTab__content'}>{children}</span>
    </Wrapper>
  );
};

export { EuiTabLink };
