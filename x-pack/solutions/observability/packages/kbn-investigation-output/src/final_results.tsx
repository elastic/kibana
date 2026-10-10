/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useLayoutEffect, useRef, useState } from 'react';
import {
  EuiBadge,
  EuiCodeBlock,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiMarkdownFormat,
  EuiModal,
  EuiModalBody,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useGeneratedHtmlId,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import type {
  InvestigationRecommendation,
  InvestigationState,
} from '@kbn/significant-events-schema';

const hasVisibleText = (text?: string): text is string => Boolean(text?.trim());

const AgentText: React.FC<{ text: string; bold?: boolean }> = ({ text, bold = false }) => {
  const { euiTheme } = useEuiTheme();

  return (
    <EuiText
      size="s"
      css={
        bold &&
        css`
          font-weight: ${euiTheme.font.weight.bold};
        `
      }
    >
      <EuiMarkdownFormat textSize="s">{text}</EuiMarkdownFormat>
    </EuiText>
  );
};

const TitleText: React.FC<{ text: string }> = ({ text }) => {
  const { euiTheme } = useEuiTheme();

  return (
    <EuiText
      component="span"
      size="s"
      css={css`
        font-weight: ${euiTheme.font.weight.bold};
      `}
    >
      {text}
    </EuiText>
  );
};

const SectionTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <EuiTitle size="s">
    <h4>{children}</h4>
  </EuiTitle>
);

const RecommendationRow: React.FC<{
  recommendation: InvestigationRecommendation;
  isRecommended: boolean;
  isLast: boolean;
  onClick?: () => void;
}> = ({ recommendation: { title }, isRecommended, isLast, onClick }) => {
  const { euiTheme } = useEuiTheme();
  const rowCss = css`
    border-bottom: ${isLast ? 'none' : euiTheme.border.thin};
    border-radius: 0;
    text-align: left;
    width: 100%;
  `;
  // A row is part of one shared panel, so hovering tints it rather than lifting it with the
  // clickable panel's own shadow, which would draw a square frame inside the rounded panel.
  const clickableRowCss = css`
    ${rowCss}
    &:hover,
    &:focus {
      box-shadow: none;
      transform: none;
      background-color: ${euiTheme.colors.backgroundBaseInteractiveHover};
    }
  `;
  const content = (
    <EuiFlexGroup component="span" alignItems="center" gutterSize="s" responsive={false}>
      <EuiFlexItem component="span">
        <TitleText text={title} />
      </EuiFlexItem>
      {isRecommended && (
        <EuiFlexItem component="span" grow={false}>
          <EuiBadge color="primary">
            {i18n.translate('xpack.investigationOutput.recommendedLabel', {
              defaultMessage: 'Recommended',
            })}
          </EuiBadge>
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );

  if (!onClick) {
    return (
      <EuiPanel hasBorder={false} hasShadow={false} paddingSize="m" css={rowCss}>
        {content}
      </EuiPanel>
    );
  }

  return (
    <EuiPanel
      element="button"
      type="button"
      hasBorder={false}
      hasShadow={false}
      paddingSize="m"
      onClick={onClick}
      css={clickableRowCss}
    >
      {content}
    </EuiPanel>
  );
};

/** Markdown cut to `maxLines` with an ellipsis, plus an Expand/Collapse link when it overflows. */
const ClampedMarkdown: React.FC<{ text: string; maxLines: number }> = ({ text, maxLines }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isOverflowing, setIsOverflowing] = useState(false);
  const textRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const element = textRef.current;
    if (!element || isExpanded) {
      return;
    }
    const measure = () => setIsOverflowing(element.scrollHeight - element.clientHeight > 1);
    measure();
    if (typeof ResizeObserver === 'undefined') {
      return;
    }
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [isExpanded, text]);

  return (
    <>
      <div
        ref={textRef}
        data-test-subj="investigationOutputConclusionText"
        css={
          !isExpanded &&
          css`
            display: -webkit-box;
            -webkit-box-orient: vertical;
            -webkit-line-clamp: ${maxLines};
            overflow: hidden;
          `
        }
      >
        <EuiMarkdownFormat textSize="s">{text}</EuiMarkdownFormat>
      </div>
      {(isOverflowing || isExpanded) && (
        <EuiText size="s">
          <EuiLink
            onClick={() => setIsExpanded((expanded) => !expanded)}
            aria-expanded={isExpanded}
            data-test-subj="investigationOutputConclusionToggle"
          >
            {isExpanded
              ? i18n.translate('xpack.investigationOutput.collapseConclusion', {
                  defaultMessage: 'Collapse',
                })
              : i18n.translate('xpack.investigationOutput.expandConclusion', {
                  defaultMessage: 'Expand',
                })}
          </EuiLink>
        </EuiText>
      )}
    </>
  );
};

/**
 * The agent's own prose `conclusion`, followed by its `recommendations` as a section. Renders
 * `null` when the investigation reported neither. The caller decides
 * when to show it — a mid-run conclusion is still a draft.
 */
export const FinalResults: React.FC<{
  state: InvestigationState;
  /** Put a "Conclusion" heading above the conclusion, for layouts where every section is titled. */
  showConclusionTitle?: boolean;
  /** Rendered between the conclusion and the proposed actions. */
  afterConclusion?: React.ReactNode;
  /** Truncate the conclusion text to this many lines, with a toggle to read it all. */
  conclusionMaxLines?: number;
}> = ({ state, showConclusionTitle = false, afterConclusion, conclusionMaxLines }) => {
  const { conclusion, recommendations } = state;
  const [selectedRecommendation, setSelectedRecommendation] =
    useState<InvestigationRecommendation>();
  const recommendationModalTitleId = useGeneratedHtmlId({ prefix: 'investigationRecommendation' });
  const selectedDescription = selectedRecommendation?.description;
  const selectedCode = selectedRecommendation?.code;

  if (!hasVisibleText(conclusion) && !recommendations?.length && !afterConclusion) {
    return null;
  }

  return (
    <EuiFlexGroup
      direction="column"
      gutterSize="l"
      data-test-subj="investigationOutputFinalResults"
    >
      {hasVisibleText(conclusion) && (
        <EuiFlexItem grow={false} data-test-subj="investigationOutputConclusion">
          {showConclusionTitle && (
            <>
              <SectionTitle>
                {i18n.translate('xpack.investigationOutput.conclusionTitle', {
                  defaultMessage: 'Conclusion',
                })}
              </SectionTitle>
              <EuiSpacer size="s" />
            </>
          )}
          {conclusionMaxLines ? (
            <ClampedMarkdown text={conclusion} maxLines={conclusionMaxLines} />
          ) : (
            <EuiMarkdownFormat textSize="s">{conclusion}</EuiMarkdownFormat>
          )}
        </EuiFlexItem>
      )}

      {afterConclusion && <EuiFlexItem grow={false}>{afterConclusion}</EuiFlexItem>}

      {recommendations && recommendations.length > 0 && (
        <EuiFlexItem grow={false}>
          <SectionTitle>
            {i18n.translate('xpack.investigationOutput.proposedActionsTitle', {
              defaultMessage: 'Proposed actions',
            })}
          </SectionTitle>
          <EuiSpacer size="s" />
          <EuiPanel
            hasBorder
            hasShadow={false}
            paddingSize="none"
            css={css`
              overflow: hidden;
            `}
            data-test-subj="investigationOutputRecommendations"
          >
            <EuiFlexGroup direction="column" gutterSize="none">
              {recommendations.map((recommendation, index) => (
                <RecommendationRow
                  key={`${recommendation.title}-${index}`}
                  recommendation={recommendation}
                  isRecommended={index === 0}
                  isLast={index === recommendations.length - 1}
                  onClick={
                    hasVisibleText(recommendation.description) ||
                    hasVisibleText(recommendation.code)
                      ? () => setSelectedRecommendation(recommendation)
                      : undefined
                  }
                />
              ))}
            </EuiFlexGroup>
          </EuiPanel>
        </EuiFlexItem>
      )}

      {selectedRecommendation && (
        <EuiModal
          aria-labelledby={recommendationModalTitleId}
          onClose={() => setSelectedRecommendation(undefined)}
        >
          <EuiModalHeader>
            <EuiModalHeaderTitle id={recommendationModalTitleId}>
              {selectedRecommendation.title}
            </EuiModalHeaderTitle>
          </EuiModalHeader>
          <EuiModalBody>
            {hasVisibleText(selectedDescription) && (
              <>
                <AgentText text={selectedDescription} />
                {hasVisibleText(selectedCode) && <EuiSpacer size="m" />}
              </>
            )}
            {hasVisibleText(selectedCode) && (
              <EuiCodeBlock language="shell" fontSize="s" paddingSize="s" isCopyable>
                {selectedCode}
              </EuiCodeBlock>
            )}
          </EuiModalBody>
        </EuiModal>
      )}
    </EuiFlexGroup>
  );
};
