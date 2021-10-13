/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Fragment, useState, useEffect } from 'react';
import { Unit } from '@elastic/datemath';
import { ThreatMapping, Type } from '@kbn/securitysolution-io-ts-alerting-types';
import styled from 'styled-components';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiSelect,
  EuiFormRow,
  EuiButton,
  EuiCallOut,
  EuiText,
  EuiSpacer,
} from '@elastic/eui';
import { FieldValueQueryBar } from '../query_bar';
import * as i18n from './translations';
import { usePreviewRoute } from './use_preview_route';
import { PreviewHistogram } from './preview_histogram';
import { getTimeframeOptions } from './helpers';

interface RulePreviewProps {
  index: string[];
  isDisabled: boolean;
  query: FieldValueQueryBar;
  ruleType: Type;
  threatIndex: string[];
  threatMapping: ThreatMapping;
  threatQuery: FieldValueQueryBar;
}

const Select = styled(EuiSelect)`
  width: ${({ theme }) => theme.eui.euiSuperDatePickerWidth};
`;

const PreviewButton = styled(EuiButton)`
  margin-left: 0;
`;

const CalloutGroup: React.FC<{ items: string[]; isError?: boolean }> = ({ items, isError }) =>
  items.length > 0 ? (
    <>
      {items.map((item, i) => (
        <Fragment key={`${item}-${i}`}>
          <EuiSpacer size="s" />
          <EuiCallOut
            color={isError ? 'danger' : 'warning'}
            iconType="help"
            data-test-subj={isError ? 'preview-error' : 'preview-warning'}
          >
            <EuiText>
              <p>{item}</p>
            </EuiText>
          </EuiCallOut>
        </Fragment>
      ))}
    </>
  ) : (
    <></>
  );

const RulePreviewComponent: React.FC<RulePreviewProps> = ({
  index,
  isDisabled,
  query,
  ruleType,
  threatIndex,
  threatQuery,
  threatMapping,
}) => {
  const [timeFrame, setTimeFrame] = useState<Unit>('h');
  const {
    addNoiseWarning,
    createPreview,
    clearPreview,
    errors,
    isPreviewRequestInProgress,
    previewId,
    warnings,
  } = usePreviewRoute({
    index,
    query,
    threatIndex,
    threatQuery,
    timeFrame,
    ruleType,
    threatMapping,
  });

  useEffect(() => {
    if (isDisabled) clearPreview();
  }, [isDisabled, clearPreview]);

  return (
    <>
      <EuiFormRow
        label={i18n.QUERY_PREVIEW_LABEL}
        helpText={i18n.QUERY_PREVIEW_HELP_TEXT}
        error={undefined}
        isInvalid={false}
        data-test-subj="rule-preview"
        describedByIds={['rule-preview']}
      >
        <EuiFlexGroup>
          <EuiFlexItem grow={1}>
            <Select
              id="previewTimeFrame"
              options={getTimeframeOptions(ruleType)}
              value={timeFrame}
              onChange={(e) => setTimeFrame(e.target.value as Unit)}
              aria-label={i18n.QUERY_PREVIEW_SELECT_ARIA}
              disabled={isDisabled}
              data-test-subj="preview-time-frame"
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <PreviewButton
              fill
              isDisabled={isDisabled || isPreviewRequestInProgress}
              onClick={createPreview}
              data-test-subj="queryPreviewButton"
            >
              {i18n.QUERY_PREVIEW_BUTTON}
            </PreviewButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFormRow>
      <EuiSpacer size="s" />
      {previewId && (
        <PreviewHistogram
          timeFrame={timeFrame}
          previewId={previewId}
          addNoiseWarning={addNoiseWarning}
        />
      )}
      <CalloutGroup items={errors} isError />
      <CalloutGroup items={warnings} />
    </>
  );
};

export const RulePreview = React.memo(RulePreviewComponent);
