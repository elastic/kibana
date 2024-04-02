/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';
import { EuiFlexGroup, EuiFlexItem, EuiIcon, EuiText } from '@elastic/eui';
import { euiThemeVars } from '@kbn/ui-theme';
import {
  actionsHeaderTooltipExpandAction,
  actionsHeaderTooltipDegradedAction,
  actionsHeaderTooltipParagraph,
  actionsHeaderTooltipStacktraceAction,
  actionsLabel,
  actionsLabelLowerCase,
} from '../../common/translations';
import { HoverPopover } from '../../common/hover_popover';
import { TooltipButtonComponent } from './tooltip_button';
import * as constants from '../../../../common/constants';
import { FieldWithToken } from './field_with_token';

const spacingCSS = css`
  margin-bottom: ${euiThemeVars.euiSizeS};
`;

export const ActionsColumnTooltip = () => {
  return (
    <HoverPopover
      button={<TooltipButtonComponent displayText={actionsLabelLowerCase} />}
      title={actionsLabel}
    >
      <div style={{ width: '230px' }}>
        <EuiText size="s" css={spacingCSS}>
          <p>{actionsHeaderTooltipParagraph}</p>
        </EuiText>
        <EuiFlexGroup
          responsive={false}
          alignItems="baseline"
          justifyContent="flexStart"
          gutterSize="s"
          css={spacingCSS}
        >
          <EuiFlexItem grow={false}>
            <EuiIcon type="expand" size="s" />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiText size="s">
              <p>{actionsHeaderTooltipExpandAction}</p>
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiFlexGroup
          responsive={false}
          alignItems="baseline"
          justifyContent="flexStart"
          gutterSize="s"
          css={spacingCSS}
        >
          <EuiFlexItem grow={false}>
            <EuiIcon type="indexClose" size="s" color="danger" />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiText size="s">
              <p>{actionsHeaderTooltipDegradedAction}</p>
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiFlexGroup
          responsive={false}
          alignItems="baseline"
          justifyContent="flexStart"
          gutterSize="s"
          css={spacingCSS}
        >
          <EuiFlexItem grow={false}>
            <EuiIcon type="apmTrace" size="s" />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiText size="s">
              <p>{actionsHeaderTooltipStacktraceAction}</p>
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
        <div style={{ marginLeft: '15px' }}>
          {[
            constants.ERROR_STACK_TRACE,
            constants.ERROR_EXCEPTION_STACKTRACE,
            constants.ERROR_LOG_STACKTRACE,
          ].map((field) => (
            <FieldWithToken field={field} key={field} />
          ))}
        </div>
      </div>
    </HoverPopover>
  );
};
