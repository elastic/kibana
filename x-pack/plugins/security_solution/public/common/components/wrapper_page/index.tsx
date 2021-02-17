/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import classNames from 'classnames';
import React, { useEffect } from 'react';
import styled from 'styled-components';
import { CommonProps } from '@elastic/eui';

import { useGlobalFullScreen } from '../../containers/use_full_screen';
import { gutterTimeline } from '../../lib/helpers';
import { AppGlobalStyle } from '../page/index';

const Wrapper = styled.div`
  padding: ${(props) => `${props.theme.eui.paddingSizes.l}`};

  &.siemWrapperPage--fullHeight {
    height: 100%;
    display: flex;
    flex-direction: column;
    flex: 1 1 auto;
  }

  &.siemWrapperPage--noPadding {
    padding: 0;
    display: flex;
    flex-direction: column;
    flex: 1 1 auto;
  }

  &.siemWrapperPage--withTimeline {
    padding-bottom: ${gutterTimeline};
  }
`;

Wrapper.displayName = 'Wrapper';

interface WrapperPageProps {
  children: React.ReactNode;
  restrictWidth?: boolean | number | string;
  style?: Record<string, string>;
  noPadding?: boolean;
  noTimeline?: boolean;
}

const WrapperPageComponent: React.FC<WrapperPageProps & CommonProps> = ({
  children,
  className,
  style,
  noPadding,
  noTimeline,
  ...otherProps
}) => {
  const { globalFullScreen, setGlobalFullScreen } = useGlobalFullScreen();
  useEffect(() => {
    setGlobalFullScreen(false); // exit full screen mode on page load
  }, [setGlobalFullScreen]);

  const classes = classNames(className, {
    siemWrapperPage: true,
    'siemWrapperPage--noPadding': noPadding,
    'siemWrapperPage--withTimeline': !noTimeline,
    'siemWrapperPage--fullHeight': globalFullScreen,
  });

  return (
    <Wrapper className={classes} style={style} {...otherProps}>
      {children}
      <AppGlobalStyle />
    </Wrapper>
  );
};

export const WrapperPage = React.memo(WrapperPageComponent);
