/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiCopy,
  EuiFlexGroup,
  EuiFlexItem,
  EuiEmptyPrompt,
  EuiSpacer,
} from '@elastic/eui';
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
  MAPPING_URL,
} from '../../index_properties/markdown/helpers';
import { CopyToClipboardButton } from '../styles';
import * as i18n from '../../index_properties/translations';
import type { EnrichedFieldMetadata } from '../../../types';

interface Props {
  addToNewCaseDisabled: boolean;
  docsCount: number;
  enrichedFieldMetadata: EnrichedFieldMetadata[];
  indexName: string;
  onAddToNewCase: (markdownComments: string[]) => void;
  version: string;
}

const NonEcsTabComponent: React.FC<Props> = ({
  addToNewCaseDisabled,
  docsCount,
  enrichedFieldMetadata,
  indexName,
  onAddToNewCase,
  version,
}) => {
  const markdownComments: string[] = useMemo(
    () => [
      getCaseSummaryMarkdownComment({
        docsCount,
        ecsFieldReferenceUrl: ECS_FIELD_REFERENCE_URL,
        ecsReferenceUrl: ECS_REFERENCE_URL,
        indexName,
        mappingUrl: MAPPING_URL,
        version,
      }),
      getNonEcsMarkdownComment({
        docsCount,
        enrichedFieldMetadata,
        indexName,
        version,
      }),
    ],
    [docsCount, enrichedFieldMetadata, indexName, version]
  );

  const onClickAddToCase = useCallback(
    () => onAddToNewCase(markdownComments),
    [markdownComments, onAddToNewCase]
  );
  const body = useMemo(() => <EmptyPromptBody body={i18n.NON_ECS_EMPTY} />, []);
  const title = useMemo(() => <EmptyPromptTitle title={i18n.NON_ECS_EMPTY_TITLE} />, []);

  return (
    <>
      {showNonEcsCallout(enrichedFieldMetadata) ? (
        <>
          <NonEcsCallout enrichedFieldMetadata={enrichedFieldMetadata} version={version}>
            <EuiFlexGroup alignItems="center" gutterSize="none">
              <EuiFlexItem grow={false}>
                <EuiButton disabled={addToNewCaseDisabled} onClick={onClickAddToCase}>
                  {i18n.ADD_TO_CASE}
                </EuiButton>
              </EuiFlexItem>

              <EuiFlexItem grow={false}>
                <EuiCopy textToCopy={markdownComments.join('\n')}>
                  {(copy) => (
                    <CopyToClipboardButton onClick={copy}>
                      {i18n.COPY_TO_CLIPBOARD}
                    </CopyToClipboardButton>
                  )}
                </EuiCopy>
              </EuiFlexItem>
            </EuiFlexGroup>
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
