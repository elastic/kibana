/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { ExceptionListItemSchema } from '@kbn/securitysolution-io-ts-list-types';
import React, { memo } from 'react';
import { EuiSpacer, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { useTestIdGenerator } from '../../../../hooks/use_test_id_generator';
import { useIsExperimentalFeatureEnabled } from '../../../../../common/hooks/use_experimental_features';
import { isFilterProcessDescendantsEnabled } from '../../../../../../common/endpoint/service/artifacts/utils';
import { ProcessDescendantsTooltip } from '../../../../pages/event_filters/view/components/process_descendant_tooltip';
import type { ArtifactEntryCardDecoratorProps } from '../../artifact_entry_card';

export const EventFiltersProcessDescendantIndicator = memo<ArtifactEntryCardDecoratorProps>(
  ({ item, 'data-test-subj': dataTestSubj, ...commonProps }) => {
    const getTestId = useTestIdGenerator(dataTestSubj);
    const isProcessDescendantFeatureEnabled = useIsExperimentalFeatureEnabled(
      'filterProcessDescendantsForEventFiltersEnabled'
    );

    if (
      isProcessDescendantFeatureEnabled &&
      isFilterProcessDescendantsEnabled(item as ExceptionListItemSchema)
    ) {
      return (
        <>
          <EuiText {...commonProps} data-test-subj={getTestId('processDescendantIndication')}>
            <code>
              <strong>
                <FormattedMessage
                  defaultMessage="Filtering descendants of process"
                  id="xpack.securitySolution.eventFilters.filteringProcessDescendants"
                />{' '}
                <ProcessDescendantsTooltip
                  indicateExtraEntry
                  data-test-subj={getTestId('processDescendantIndicationTooltip')}
                />
              </strong>
            </code>
          </EuiText>
          <EuiSpacer size="m" />
        </>
      );
    }

    return <></>;
  }
);
EventFiltersProcessDescendantIndicator.displayName = 'EventFiltersProcessDescendantIndicator';
