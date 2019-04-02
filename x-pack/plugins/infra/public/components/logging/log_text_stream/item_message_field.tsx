/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { darken, transparentize } from 'polished';
import * as React from 'react';

import euiStyled, { css } from '../../../../../../common/eui_styled_components';
import { TextScale } from '../../../../common/log_text_scale';
import { tintOrShade } from '../../../utils/styles';
import { LogTextStreamItemField } from './item_field';

interface LogTextStreamItemMessageFieldProps {
  children: string;
  highlights: string[];
  isHovered: boolean;
  isWrapped: boolean;
  scale: TextScale;
}

export class LogTextStreamItemMessageField extends React.PureComponent<
  LogTextStreamItemMessageFieldProps,
  {}
> {
  public render() {
    const { children, highlights, isHovered, isWrapped, scale } = this.props;

    const hasHighlights = highlights.length > 0;
    const content = hasHighlights ? renderHighlightFragments(children, highlights) : children;
    return (
      <LogTextStreamItemMessageFieldWrapper
        hasHighlights={hasHighlights}
        isHovered={isHovered}
        isWrapped={isWrapped}
        scale={scale}
      >
        {content}
      </LogTextStreamItemMessageFieldWrapper>
    );
  }
}

const renderHighlightFragments = (text: string, highlights: string[]): React.ReactNode[] => {
  const renderedHighlights = highlights.reduce(
    ({ lastFragmentEnd, renderedFragments }, highlight) => {
      const fragmentStart = text.indexOf(highlight, lastFragmentEnd);
      return {
        lastFragmentEnd: fragmentStart + highlight.length,
        renderedFragments: [
          ...renderedFragments,
          text.slice(lastFragmentEnd, fragmentStart),
          <HighlightSpan key={fragmentStart}>{highlight}</HighlightSpan>,
        ],
      };
    },
    {
      lastFragmentEnd: 0,
      renderedFragments: [],
    } as {
      lastFragmentEnd: number;
      renderedFragments: React.ReactNode[];
    }
  );

  return [...renderedHighlights.renderedFragments, text.slice(renderedHighlights.lastFragmentEnd)];
};

const highlightedFieldStyle = css`
  background-color: ${props =>
    tintOrShade(
      props.theme.eui.euiTextColor as any, // workaround for incorrect upstream `tintOrShade` types
      props.theme.eui.euiColorSecondary as any,
      0.15
    )};
`;

const hoveredFieldStyle = css`
  background-color: ${props =>
    props.theme.darkMode
      ? transparentize(0.9, darken(0.05, props.theme.eui.euiColorHighlight))
      : darken(0.05, props.theme.eui.euiColorHighlight)};
`;

const wrappedFieldStyle = css`
  overflow: visible;
  white-space: pre-wrap;
  word-break: break-all;
`;

const unwrappedFieldStyle = css`
  overflow: hidden;
  white-space: pre;
`;

const LogTextStreamItemMessageFieldWrapper = LogTextStreamItemField.extend.attrs<{
  hasHighlights: boolean;
  isHovered: boolean;
  isWrapped?: boolean;
}>({})`
  flex-grow: 1;
  text-overflow: ellipsis;
  background-color: ${props => props.theme.eui.euiColorEmptyShade};

  ${props => (props.hasHighlights ? highlightedFieldStyle : '')};
  ${props => (props.isHovered ? hoveredFieldStyle : '')};
  ${props => (props.isWrapped ? wrappedFieldStyle : unwrappedFieldStyle)};
`;

const HighlightSpan = euiStyled.span`
  display: inline-block;
  background-color: ${props => props.theme.eui.euiColorSecondary};
  color: ${props => props.theme.eui.euiColorGhost};
  font-weight: ${props => props.theme.eui.euiFontWeightMedium};
`;
