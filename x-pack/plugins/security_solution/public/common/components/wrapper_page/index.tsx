/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import classNames from 'classnames';
import React, { useEffect } from 'react';
import styled from 'styled-components';
import { CommonProps } from '@elastic/eui';

import { useFullScreen } from '../../containers/use_full_screen';
import { gutterTimeline } from '../../lib/helpers';
import { AppGlobalStyle } from '../page/index';

const Wrapper = styled.div`
  padding: ${(props) => `${props.theme.eui.paddingSizes.l}`};

  &.siemWrapperPage--restrictWidthDefault,
  &.siemWrapperPage--restrictWidthCustom {
    box-sizing: content-box;
    margin: 0 auto;
  }

  &.siemWrapperPage--restrictWidthDefault {
    max-width: 1000px;
  }

  &.siemWrapperPage--fullHeight {
    height: 100%;
  }

  &.siemWrapperPage--withTimeline {
    padding-right: ${gutterTimeline};
  }

  &.siemWrapperPage--noPadding {
    padding: 0;
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
  restrictWidth,
  style,
  noPadding,
  noTimeline,
  ...otherProps
}) => {
  const { globalFullScreen, setGlobalFullScreen } = useFullScreen();
  useEffect(() => {
    setGlobalFullScreen(false); // exit full screen mode on page load
  }, [setGlobalFullScreen]);

  const classes = classNames(className, {
    siemWrapperPage: true,
    'siemWrapperPage--noPadding': noPadding,
    'siemWrapperPage--withTimeline': !noTimeline,
    'siemWrapperPage--fullHeight': globalFullScreen,
    'siemWrapperPage--restrictWidthDefault':
      restrictWidth && typeof restrictWidth === 'boolean' && restrictWidth === true,
    'siemWrapperPage--restrictWidthCustom': restrictWidth && typeof restrictWidth !== 'boolean',
  });

  let customStyle: WrapperPageProps['style'];

  if (restrictWidth && typeof restrictWidth !== 'boolean') {
    const value = typeof restrictWidth === 'number' ? `${restrictWidth}px` : restrictWidth;
    customStyle = { ...style, maxWidth: value };
  }

  return (
    <Wrapper className={classes} style={customStyle || style} {...otherProps}>
      {children}
      <AppGlobalStyle />
    </Wrapper>
  );
};

export const WrapperPage = React.memo(WrapperPageComponent);
