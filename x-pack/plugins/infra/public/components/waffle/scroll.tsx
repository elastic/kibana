/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import styled from 'styled-components';

interface Props {
  hasScroll: boolean;
  innerRef: (el: any) => void;
}

export const Scroll: React.SFC<Props> = ({ hasScroll, children, innerRef }) => {
  if (hasScroll) {
    return <WithScroll innerRef={innerRef}>{children}</WithScroll>;
  }
  return <WithoutScroll innerRef={innerRef}>{children}</WithoutScroll>;
};

const WithScroll = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  bottom: 0;
  right: 0;
  overflow: auto;
  padding-bottom: 20px;
`;

const WithoutScroll = WithScroll.extend`
  display: flex;
  justify-content: center;
  align-items: center;
`;
