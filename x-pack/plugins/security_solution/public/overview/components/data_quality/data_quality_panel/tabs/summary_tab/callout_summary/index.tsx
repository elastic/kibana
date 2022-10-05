/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiSpacer } from '@elastic/eui';
import React, { useCallback, useMemo } from 'react';

import { MissingTimestampCallout } from '../../callouts/missing_timestamp_callout';
import { NonEcsCallout } from '../../callouts/non_ecs_callout';
import { NotEcsCompliantCallout } from '../../callouts/not_ecs_compliant_callout';
import { showMissingTimestampCallout } from '../../ecs_compliant_tab/helpers';
import { getMarkdownComments } from '../helpers';
import {
  ECS_FIELD_REFERENCE_URL,
  ECS_REFERENCE_URL,
  getCaseSummaryMarkdownComment,
  UPDATE_MAPPING_URL,
} from '../../../index_properties/markdown/helpers';
import { showNotEcsCompliantCallout } from '../../not_ecs_compliant_tab/helpers';
import { showNonEcsCallout } from '../../non_ecs_tab/helpers';
import * as i18n from '../../../index_properties/translations';
import type { PartitionedFieldMetadata } from '../../../../types';

interface Props {
  addToNewCaseDisabled: boolean;
  indexName: string;
  onAddToNewCase: (markdownComment: string[]) => void;
  partitionedFieldMetadata: PartitionedFieldMetadata;
  version: string;
}

const CalloutSummaryComponent: React.FC<Props> = ({
  addToNewCaseDisabled,
  indexName,
  onAddToNewCase,
  partitionedFieldMetadata,
  version,
}) => {
  const markdownComments = useMemo(
    () => [
      getCaseSummaryMarkdownComment({
        ecsFieldReferenceUrl: ECS_FIELD_REFERENCE_URL,
        ecsReferenceUrl: ECS_REFERENCE_URL,
        indexName,
        updateMappingUrl: UPDATE_MAPPING_URL,
        version,
      }),
      ...getMarkdownComments({
        indexName,
        partitionedFieldMetadata,
      }),
    ],
    [indexName, partitionedFieldMetadata, version]
  );
  const onClick = useCallback(
    () => onAddToNewCase(markdownComments),
    [markdownComments, onAddToNewCase]
  );

  return (
    <>
      {showNotEcsCompliantCallout(partitionedFieldMetadata.notEcsCompliant) && (
        <>
          <NotEcsCompliantCallout
            enrichedFieldMetadata={partitionedFieldMetadata.notEcsCompliant}
          />
          <EuiSpacer size="s" />
        </>
      )}
      {showNonEcsCallout(partitionedFieldMetadata.nonEcs) && (
        <>
          <NonEcsCallout enrichedFieldMetadata={partitionedFieldMetadata.nonEcs} />
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
          <EuiButton disabled={addToNewCaseDisabled} onClick={onClick}>
            {i18n.ADD_TO_CASE}
          </EuiButton>
          <EuiSpacer size="s" />
        </>
      )}
    </>
  );
};

CalloutSummaryComponent.displayName = 'CalloutSummaryComponent';

export const CalloutSummary = React.memo(CalloutSummaryComponent);
