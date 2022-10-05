/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiCallOut, EuiEmptyPrompt, EuiSpacer } from '@elastic/eui';
import React, { useCallback, useMemo } from 'react';
import styled from 'styled-components';

import { MissingTimestampCallout } from '../callouts/missing_timestamp_callout';
import { CompareFieldsTable } from '../../../compare_fields_table';
import { EmptyPromptBody } from '../../index_properties/empty_prompt_body';
import { EmptyPromptTitle } from '../../index_properties/empty_prompt_title';
import { getMissingTimestampComment, showMissingTimestampCallout } from './helpers';
import {
  getCaseSummaryMarkdownComment,
  ECS_FIELD_REFERENCE_URL,
  ECS_REFERENCE_URL,
  UPDATE_MAPPING_URL,
} from '../../index_properties/markdown/helpers';
import { CalloutItem } from '../styles';
import * as i18n from '../../index_properties/translations';
import type { EnrichedFieldMetadata } from '../../../types';

const EmptyPromptContainer = styled.div`
  width: 100%;
`;

interface Props {
  addToNewCaseDisabled: boolean;
  enrichedFieldMetadata: EnrichedFieldMetadata[];
  indexName: string;
  onAddToNewCase: (markdownComments: string[]) => void;
  version: string;
}

const EcsCompliantTabComponent: React.FC<Props> = ({
  addToNewCaseDisabled,
  enrichedFieldMetadata,
  indexName,
  onAddToNewCase,
  version,
}) => {
  const onClick = useCallback(() => {
    onAddToNewCase([
      getCaseSummaryMarkdownComment({
        ecsFieldReferenceUrl: ECS_FIELD_REFERENCE_URL,
        ecsReferenceUrl: ECS_REFERENCE_URL,
        indexName,
        updateMappingUrl: UPDATE_MAPPING_URL,
        version,
      }),
      getMissingTimestampComment({
        enrichedFieldMetadata,
        indexName,
      }),
    ]);
  }, [enrichedFieldMetadata, indexName, onAddToNewCase, version]);
  const emptyPromptBody = useMemo(() => <EmptyPromptBody body={i18n.ECS_COMPLIANT_EMPTY} />, []);
  const title = useMemo(() => <EmptyPromptTitle title={i18n.ECS_COMPLIANT_EMPTY_TITLE} />, []);

  return (
    <>
      {!showMissingTimestampCallout(enrichedFieldMetadata) ? (
        <>
          <EuiCallOut
            size="s"
            title={i18n.ECS_COMPLIANT_CALLOUT_TITLE(enrichedFieldMetadata.length)}
          >
            <p>{i18n.ECS_COMPLIANT_CALLOUT(enrichedFieldMetadata.length)}</p>
            <CalloutItem>{i18n.ECS_COMPLIANT_MAPPINGS_ARE_FULLY_SUPPORTED}</CalloutItem>
            <CalloutItem>{i18n.PRE_BUILT_DETECTION_ENGINE_RULES_WORK}</CalloutItem>
            <CalloutItem>{i18n.CUSTOM_DETECTION_ENGINE_RULES_WORK}</CalloutItem>
            <CalloutItem>{i18n.PAGES_DISPLAY_EVENTS}</CalloutItem>
            <CalloutItem>{i18n.OTHER_APP_CAPABILITIES_WORK_PROPERLY}</CalloutItem>
          </EuiCallOut>
          <EuiSpacer />
          <CompareFieldsTable enrichedFieldMetadata={enrichedFieldMetadata} />
        </>
      ) : (
        <EmptyPromptContainer>
          <MissingTimestampCallout>
            <EuiButton disabled={addToNewCaseDisabled} onClick={onClick}>
              {i18n.ADD_TO_CASE}
            </EuiButton>
          </MissingTimestampCallout>
          <EuiEmptyPrompt
            body={emptyPromptBody}
            iconType="cross"
            iconColor="danger"
            title={title}
            titleSize="s"
          />
        </EmptyPromptContainer>
      )}
    </>
  );
};

EcsCompliantTabComponent.displayName = 'EcsCompliantTabComponent';

export const EcsCompliantTab = React.memo(EcsCompliantTabComponent);
