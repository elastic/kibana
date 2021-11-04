/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useEffect } from 'react';
import { Unit } from '@elastic/datemath';
import { ThreatMapping, Type } from '@kbn/securitysolution-io-ts-alerting-types';
import styled from 'styled-components';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiSelect,
  EuiFormRow,
  EuiButton,
  EuiSpacer,
} from '@elastic/eui';
import { FieldValueQueryBar } from '../query_bar';
import * as i18n from './translations';
import { usePreviewRoute } from './use_preview_route';
import { PreviewHistogram } from './preview_histogram';
import { getTimeframeOptions } from './helpers';
import { CalloutGroup } from './callout_group';
import { useKibana } from '../../../../common/lib/kibana';
import { LoadingHistogram } from './loading_histogram';
import { FieldValueThreshold } from '../threshold_input';

export interface RulePreviewProps {
  index: string[];
  isDisabled: boolean;
  query: FieldValueQueryBar;
  ruleType: Type;
  threatIndex: string[];
  threatMapping: ThreatMapping;
  threatQuery: FieldValueQueryBar;
  threshold: FieldValueThreshold;
}

const Select = styled(EuiSelect)`
  width: ${({ theme }) => theme.eui.euiSuperDatePickerWidth};
`;

const PreviewButton = styled(EuiButton)`
  margin-left: 0;
`;

const RulePreviewComponent: React.FC<RulePreviewProps> = ({
  index,
  isDisabled,
  query,
  ruleType,
  threatIndex,
  threatQuery,
  threatMapping,
  threshold,
}) => {
  const { spaces } = useKibana().services;
  const [spaceId, setSpaceId] = useState('');
  useEffect(() => {
    if (spaces) {
      spaces.getActiveSpace().then((space) => setSpaceId(space.id));
    }
  }, [spaces]);

  const [timeFrame, setTimeFrame] = useState<Unit>('h');
  const {
    addNoiseWarning,
    createPreview,
    errors,
    isPreviewRequestInProgress,
    previewId,
    warnings,
  } = usePreviewRoute({
    index,
    isDisabled,
    query,
    threatIndex,
    threatQuery,
    timeFrame,
    ruleType,
    threatMapping,
    threshold,
  });

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
              id="preview-time-frame"
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
              isLoading={isPreviewRequestInProgress}
              isDisabled={isDisabled}
              onClick={createPreview}
              data-test-subj="queryPreviewButton"
            >
              {i18n.QUERY_PREVIEW_BUTTON}
            </PreviewButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFormRow>
      <EuiSpacer size="s" />
      {isPreviewRequestInProgress && <LoadingHistogram />}
      {!isPreviewRequestInProgress && previewId && spaceId && (
        <PreviewHistogram
          ruleType={ruleType}
          timeFrame={timeFrame}
          previewId={previewId}
          addNoiseWarning={addNoiseWarning}
          spaceId={spaceId}
          threshold={threshold}
        />
      )}
      <CalloutGroup items={errors} isError />
      <CalloutGroup items={warnings} />
    </>
  );
};

export const RulePreview = React.memo(RulePreviewComponent);
