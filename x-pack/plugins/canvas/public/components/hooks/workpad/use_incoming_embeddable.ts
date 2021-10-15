/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { CANVAS_APP } from '../../../../common/lib';
import { encode } from '../../../../common/lib/embeddable_dataurl';
import { useEmbeddablesService } from '../../../services';
// @ts-expect-error unconverted file
import { addElement } from '../../../state/actions/elements';
// @ts-expect-error unconverted file
import { selectToplevelNodes } from '../../../state/actions/transient';

import {
  updateEmbeddableExpression,
  fetchEmbeddableRenderable,
} from '../../../state/actions/embeddable';
import { clearValue } from '../../../state/actions/resolved_args';

export const useIncomingEmbeddable = (pageId: string) => {
  const embeddablesService = useEmbeddablesService();
  const dispatch = useDispatch();
  const stateTransferService = embeddablesService.getStateTransfer();

  // fetch incoming embeddable from state transfer service.
  const incomingEmbeddable = stateTransferService.getIncomingEmbeddablePackage(CANVAS_APP, true);

  useEffect(() => {
    if (incomingEmbeddable) {
      const { embeddableId, input, type } = incomingEmbeddable;

      const config = encode(input);
      const expression = `embeddable config="${config}"
  type="${type}" 
| render`;

      if (embeddableId) {
        // clear out resolved arg for old embeddable
        const argumentPath = [embeddableId, 'expressionRenderable'];
        dispatch(clearValue({ path: argumentPath }));

        // update existing embeddable expression
        dispatch(
          updateEmbeddableExpression({ elementId: embeddableId, embeddableExpression: expression })
        );

        // update resolved args
        dispatch(fetchEmbeddableRenderable(embeddableId));

        // select new embeddable element
        dispatch(selectToplevelNodes([embeddableId]));
      } else {
        dispatch(addElement(pageId, { expression }));
      }
    }
  }, [dispatch, pageId, incomingEmbeddable]);
};
