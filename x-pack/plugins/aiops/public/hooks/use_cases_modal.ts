/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import { stringHash } from '@kbn/ml-string-hash';
import { AttachmentType } from '@kbn/cases-plugin/common';
import { useCasesAddToExistingCaseModal } from '@kbn/cases-plugin/public/components/all_cases/selector_modal/use_cases_add_to_existing_case_modal';
import type { EmbeddableChangePointChartInput } from '../embeddable/embeddable_change_point_chart';
import type { EmbeddableChangePointChartType } from '../embeddable/embeddable_change_point_chart_factory';

/**
 * Returns a callback for opening the cases modal with provided attachment state.
 */
export const useCasesModal = <EmbeddableType extends EmbeddableChangePointChartType>(
  embeddableType: EmbeddableType
) => {
  const selectCaseModal = useCasesAddToExistingCaseModal();

  return useCallback(
    (persistableState: Partial<Omit<EmbeddableChangePointChartInput, 'id'>>) => {
      const persistableStateAttachmentState = {
        ...persistableState,
        // Creates unique id based on the input
        id: stringHash(JSON.stringify(persistableState)).toString(),
      };

      if (!selectCaseModal) {
        throw new Error('Cases modal is not available');
      }

      selectCaseModal.open({
        getAttachments: () => [
          {
            type: AttachmentType.persistableState,
            persistableStateAttachmentTypeId: embeddableType,
            persistableStateAttachmentState: JSON.parse(
              JSON.stringify(persistableStateAttachmentState)
            ),
          },
        ],
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [embeddableType]
  );
};
