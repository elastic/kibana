/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiEmptyPrompt, EuiSpacer } from '@elastic/eui';
import React, { useCallback, useMemo } from 'react';

import { NonEcsCallout } from '../callouts/non_ecs_callout';
import { CompareFieldsTable } from '../../../compare_fields_table';
import { EmptyPromptBody } from '../../index_properties/empty_prompt_body';
import { EmptyPromptTitle } from '../../index_properties/empty_prompt_title';
import { getNonEcsMarkdownComment, showNonEcsCallout } from './helpers';
import {
  getCaseSummaryMarkdownComment,
  ECS_FIELD_REFERENCE_URL,
  ECS_REFERENCE_URL,
  UPDATE_MAPPING_URL,
} from '../../index_properties/markdown/helpers';
import * as i18n from '../../index_properties/translations';
import type { EnrichedFieldMetadata } from '../../../types';

interface Props {
  addToNewCaseDisabled: boolean;
  enrichedFieldMetadata: EnrichedFieldMetadata[];
  indexName: string;
  onAddToNewCase: (markdownComments: string[]) => void;
  version: string;
}

const NonEcsTabComponent: React.FC<Props> = ({
  addToNewCaseDisabled,
  enrichedFieldMetadata,
  indexName,
  onAddToNewCase,
  version,
}) => {
  const onClick = useCallback(
    () =>
      onAddToNewCase([
        getCaseSummaryMarkdownComment({
          ecsFieldReferenceUrl: ECS_FIELD_REFERENCE_URL,
          ecsReferenceUrl: ECS_REFERENCE_URL,
          indexName,
          updateMappingUrl: UPDATE_MAPPING_URL,
          version,
        }),
        getNonEcsMarkdownComment({
          enrichedFieldMetadata,
          indexName,
        }),
      ]),
    [enrichedFieldMetadata, indexName, onAddToNewCase, version]
  );
  const body = useMemo(() => <EmptyPromptBody body={i18n.NON_ECS_EMPTY} />, []);
  const title = useMemo(() => <EmptyPromptTitle title={i18n.NON_ECS_EMPTY_TITLE} />, []);

  return (
    <>
      {showNonEcsCallout(enrichedFieldMetadata) ? (
        <>
          <NonEcsCallout enrichedFieldMetadata={enrichedFieldMetadata}>
            <EuiButton disabled={addToNewCaseDisabled} onClick={onClick}>
              {i18n.ADD_TO_CASE}
            </EuiButton>
          </NonEcsCallout>
          <EuiSpacer />
          <CompareFieldsTable enrichedFieldMetadata={enrichedFieldMetadata} />
        </>
      ) : (
        <EuiEmptyPrompt body={body} title={title} titleSize="s" />
      )}
    </>
  );
};

NonEcsTabComponent.displayName = 'NonEcsTabComponent';

export const NonEcsTab = React.memo(NonEcsTabComponent);
