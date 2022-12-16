/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiCopy, EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import React, { useCallback, useMemo } from 'react';

import { MissingTimestampCallout } from '../../callouts/missing_timestamp_callout';
import { NonEcsCallout } from '../../callouts/non_ecs_callout';
import { NotEcsCompliantCallout } from '../../callouts/not_ecs_compliant_callout';
import { showMissingTimestampCallout } from '../../helpers';
import { getMarkdownComments } from '../helpers';
import {
  ECS_FIELD_REFERENCE_URL,
  ECS_REFERENCE_URL,
  getCaseSummaryMarkdownComment,
  MAPPING_URL,
} from '../../../index_properties/markdown/helpers';
import { showNotEcsCompliantCallout } from '../../not_ecs_compliant_tab/helpers';
import { showNonEcsCallout } from '../../non_ecs_tab/helpers';
import { CopyToClipboardButton } from '../../styles';
import * as i18n from '../../../index_properties/translations';
import type { PartitionedFieldMetadata } from '../../../../types';

interface Props {
  addToNewCaseDisabled: boolean;
  docsCount: number;
  indexName: string;
  onAddToNewCase: (markdownComment: string[]) => void;
  partitionedFieldMetadata: PartitionedFieldMetadata;
  version: string;
}

const CalloutSummaryComponent: React.FC<Props> = ({
  addToNewCaseDisabled,
  docsCount,
  indexName,
  onAddToNewCase,
  partitionedFieldMetadata,
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
      ...getMarkdownComments({
        docsCount,
        indexName,
        partitionedFieldMetadata,
        version,
      }),
    ],
    [docsCount, indexName, partitionedFieldMetadata, version]
  );

  const onClickAddToCase = useCallback(
    () => onAddToNewCase(markdownComments),
    [markdownComments, onAddToNewCase]
  );

  return (
    <>
      {showNotEcsCompliantCallout(partitionedFieldMetadata.notEcsCompliant) && (
        <>
          <NotEcsCompliantCallout
            enrichedFieldMetadata={partitionedFieldMetadata.notEcsCompliant}
            version={version}
          />
          <EuiSpacer size="s" />
        </>
      )}
      {showNonEcsCallout(partitionedFieldMetadata.nonEcs) && (
        <>
          <NonEcsCallout
            enrichedFieldMetadata={partitionedFieldMetadata.nonEcs}
            version={version}
          />
          <EuiSpacer size="s" />
        </>
      )}
      {showMissingTimestampCallout(partitionedFieldMetadata.ecsCompliant) && (
        <>
          <MissingTimestampCallout />
          <EuiSpacer size="s" />
        </>
      )}
      {markdownComments.length > 0 && (
        <>
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

          <EuiSpacer size="s" />
        </>
      )}
    </>
  );
};

CalloutSummaryComponent.displayName = 'CalloutSummaryComponent';

export const CalloutSummary = React.memo(CalloutSummaryComponent);
