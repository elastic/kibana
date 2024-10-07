/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC, PropsWithChildren } from 'react';
import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiText, EuiButtonEmpty, EuiToolTip } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { QUERY_MODE } from '@kbn/aiops-log-pattern-analysis/get_category_query';
import { useEuiTheme } from '../../../hooks/use_eui_theme';
import type { OpenInDiscover } from './use_open_in_discover';

interface Props {
  categoriesCount: number;
  selectedCategoriesCount: number;
  openInDiscover: OpenInDiscover;
}

export const TableHeader: FC<Props> = ({
  categoriesCount,
  selectedCategoriesCount,
  openInDiscover,
}) => {
  const euiTheme = useEuiTheme();
  return (
    <EuiFlexGroup gutterSize="none" alignItems="center" css={{ minHeight: euiTheme.euiSizeXL }}>
      <EuiFlexItem>
        <EuiText size="s" data-test-subj="aiopsLogPatternsFoundCount">
          <FormattedMessage
            id="xpack.aiops.logCategorization.counts"
            defaultMessage="{count} {count, plural, one {pattern} other {patterns}} found"
            values={{ count: categoriesCount }}
          />
          {selectedCategoriesCount > 0 ? (
            <>
              <FormattedMessage
                id="xpack.aiops.logCategorization.selectedCounts"
                defaultMessage=" | {count} selected"
                values={{ count: selectedCategoriesCount }}
              />
            </>
          ) : null}
        </EuiText>
      </EuiFlexItem>
      {selectedCategoriesCount > 0 ? (
        <EuiFlexItem grow={false}>
          <OpenInDiscoverButtons openInDiscover={openInDiscover} />
        </EuiFlexItem>
      ) : null}
    </EuiFlexGroup>
  );
};

export const OpenInDiscoverButtons: FC<{ openInDiscover: OpenInDiscover; showText?: boolean }> = ({
  openInDiscover,
  showText = true,
}) => {
  const { getLabels, openFunction } = openInDiscover;
  const labels = getLabels(false);

  return (
    <EuiFlexGroup gutterSize="none" alignItems="center">
      <EuiFlexItem grow={false}>
        <TooltipWrapper text={labels.multiSelect.in} showText={showText}>
          <EuiButtonEmpty
            data-test-subj="aiopsLogPatternAnalysisOpenInDiscoverIncludeButton"
            size="s"
            onClick={() => openFunction(QUERY_MODE.INCLUDE, true)}
            iconType="plusInCircle"
            iconSide="left"
          >
            {labels.multiSelect.in}
          </EuiButtonEmpty>
        </TooltipWrapper>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <TooltipWrapper text={labels.multiSelect.out} showText={showText}>
          <EuiButtonEmpty
            data-test-subj="aiopsLogPatternAnalysisOpenInDiscoverExcludeButton"
            size="s"
            onClick={() => openFunction(QUERY_MODE.EXCLUDE, true)}
            iconType="minusInCircle"
            iconSide="left"
          >
            {labels.multiSelect.out}
          </EuiButtonEmpty>
        </TooltipWrapper>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

const TooltipWrapper: FC<PropsWithChildren<{ text: string; showText: boolean }>> = ({
  text,
  showText,
  children,
}) => {
  return showText ? (
    <>{children}</>
  ) : (
    <EuiToolTip content={text}>
      <>{children}</>
    </EuiToolTip>
  );
};
