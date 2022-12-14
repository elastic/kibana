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

import { NotEcsCompliantCallout } from '../callouts/not_ecs_compliant_callout';
import { CompareFieldsTable } from '../../../compare_fields_table';
import { EmptyPromptBody } from '../../index_properties/empty_prompt_body';
import { EmptyPromptTitle } from '../../index_properties/empty_prompt_title';
import { getNotEcsCompliantMarkdownComment, showNotEcsCompliantCallout } from './helpers';
import {
  ECS_FIELD_REFERENCE_URL,
  ECS_REFERENCE_URL,
  getCaseSummaryMarkdownComment,
  UPDATE_MAPPING_URL,
} from '../../index_properties/markdown/helpers';
import * as i18n from '../../index_properties/translations';
import { CopyToClipboardButton } from '../styles';
import type { EnrichedFieldMetadata } from '../../../types';

interface Props {
  addToNewCaseDisabled: boolean;
  docsCount: number;
  enrichedFieldMetadata: EnrichedFieldMetadata[];
  indexName: string;
  onAddToNewCase: (markdownComments: string[]) => void;
  version: string;
}

const NotEcsCompliantTabComponent: React.FC<Props> = ({
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
        updateMappingUrl: UPDATE_MAPPING_URL,
        version,
      }),
      getNotEcsCompliantMarkdownComment({
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
  const body = useMemo(() => <EmptyPromptBody body={i18n.NOT_ECS_COMPLIANT_EMPTY} />, []);
  const title = useMemo(() => <EmptyPromptTitle title={i18n.NOT_ECS_COMPLIANT_EMPTY_TITLE} />, []);

  return (
    <>
      {showNotEcsCompliantCallout(enrichedFieldMetadata) ? (
        <>
          <NotEcsCompliantCallout enrichedFieldMetadata={enrichedFieldMetadata} version={version}>
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
          </NotEcsCompliantCallout>

          <EuiSpacer />

          <CompareFieldsTable enrichedFieldMetadata={enrichedFieldMetadata} />
        </>
      ) : (
        <EuiEmptyPrompt
          body={body}
          iconType="check"
          iconColor="success"
          title={title}
          titleSize="s"
        />
      )}
    </>
  );
};

NotEcsCompliantTabComponent.displayName = 'NotEcsCompliantTabComponent';

export const NotEcsCompliantTab = React.memo(NotEcsCompliantTabComponent);
