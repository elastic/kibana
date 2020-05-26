/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import styled from 'styled-components';
import React from 'react';
import { EuiPanel } from '@elastic/eui';

/**
 * The reason for the type of syntax below of:
 * `styled(({ loading, ...props })`
 * is filter out the "loading" attribute from being put on the DOM
 * and getting one of the stack traces from
 * ```
 * ReactJS about non-standard HTML such as this one:
 * Warning: Received `true` for a non-boolean attribute `loading`.
 * If you want to write it to the DOM, pass a string instead: loading="true" or loading={value.toString()}.
 * ```
 *
 * Ref: https://github.com/styled-components/styled-components/issues/1198#issuecomment-425650423
 * Ref: https://github.com/elastic/kibana/pull/41596#issuecomment-514418978
 * Ref: https://www.styled-components.com/docs/faqs#why-am-i-getting-html-attribute-warnings
 * Ref: https://reactjs.org/blog/2017/09/08/dom-attributes-in-react-16.html
 */
export const Panel = styled(({ loading, ...props }) => <EuiPanel {...props} />)`
  position: relative;
  ${({ loading }) =>
    loading &&
    `
    overflow: hidden;
  `}
`;

Panel.displayName = 'Panel';
