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
import type { MappedEmbeddableTypeOf, MlEmbeddableTypes } from '../../../embeddables';

/**
 * Returns a callback for opening the cases modal with provided attachment state.
 */
export const useCasesModal = <EmbeddableType extends MlEmbeddableTypes>(
  embeddableType: EmbeddableType
) => {
  const selectCaseModal = useCasesAddToExistingCaseModal();

  return useCallback(
    (persistableState: Partial<Omit<MappedEmbeddableTypeOf<EmbeddableType>, 'id'>>) => {
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
            // TODO Cases: improve type for persistableStateAttachmentState with io-ts
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
