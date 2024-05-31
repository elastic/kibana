/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { euiStyled } from '@kbn/kibana-react-plugin/common';
import { transparentize } from 'polished';
import { ASSUMED_SCROLLBAR_WIDTH } from './vertical_scroll_panel';

export const LogColumnHeadersWrapper = euiStyled.div.attrs((props) => ({
  role: props.role ?? 'row',
}))`
    align-items: stretch;
    display: flex;
    flex-direction: row;
    flex-wrap: nowrap;
    justify-content: flex-start;
    overflow: hidden;
    padding-right: ${ASSUMED_SCROLLBAR_WIDTH}px;
    border-bottom: ${(props) => props.theme.eui.euiBorderThin};
    box-shadow: 0 2px 2px -1px ${(props) =>
      transparentize(0.3, props.theme.eui.euiColorLightShade)};
    position: relative;
    z-index: 1;
  `;

// eslint-disable-next-line import/no-default-export
export default LogColumnHeadersWrapper;
