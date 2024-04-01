/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { fromExpression } from '@kbn/interpreter';
import { ErrorStrings } from '../../../../i18n';
import { CANVAS_APP } from '../../../../common/lib';
import { decode, encode } from '../../../../common/lib/embeddable_dataurl';
import { CanvasElement, CanvasPage } from '../../../../types';
import { useEmbeddablesService, useLabsService, useNotifyService } from '../../../services';
// @ts-expect-error unconverted file
import { addElement, fetchAllRenderables } from '../../../state/actions/elements';
// @ts-expect-error unconverted file
import { selectToplevelNodes } from '../../../state/actions/transient';

import {
  updateEmbeddableExpression,
  fetchEmbeddableRenderable,
} from '../../../state/actions/embeddable';
import { clearValue } from '../../../state/actions/resolved_args';
import { embeddableInputToExpression } from '../../../../canvas_plugin_src/renderers/embeddable/embeddable_input_to_expression';

const { actionsElements: strings } = ErrorStrings;

export const useIncomingEmbeddable = (selectedPage: CanvasPage) => {
  const embeddablesService = useEmbeddablesService();
  const labsService = useLabsService();
  const dispatch = useDispatch();
  const notifyService = useNotifyService();
  const isByValueEnabled = labsService.isProjectEnabled('labs:canvas:byValueEmbeddable');
  const stateTransferService = embeddablesService.getStateTransfer();

  // fetch incoming embeddable from state transfer service.
  const incomingEmbeddable = stateTransferService.getIncomingEmbeddablePackage(CANVAS_APP, true);

  useEffect(() => {
    if (isByValueEnabled && incomingEmbeddable) {
      const { embeddableId, input: incomingInput, type } = incomingEmbeddable;

      // retrieve existing element
      const originalElement = selectedPage.elements.find(
        ({ id }: CanvasElement) => id === embeddableId
      );

      if (originalElement) {
        const originalAst = fromExpression(originalElement!.expression);

        const functionIndex = originalAst.chain.findIndex(({ function: fn }) =>
          ['embeddable', 'savedVisualization'].includes(fn)
        );

        if (functionIndex === -1) {
          dispatch(fetchAllRenderables());
          return;
        }

        if (originalAst.chain[functionIndex].function === 'savedVisualization') {
          notifyService.error(strings.getConvertToLensUnsupportedSavedVisualization());
          dispatch(fetchAllRenderables());
          return;
        }

        const originalInput = decode(
          originalAst.chain[functionIndex].arguments.config[0] as string
        );

        const originalType = originalAst.chain[functionIndex].arguments.type[0];

        // clear out resolved arg for old embeddable
        const argumentPath = [embeddableId, 'expressionRenderable'];
        dispatch(clearValue({ path: argumentPath }));

        let updatedInput;

        // if type was changed, we should not provide originalInput
        if (originalType !== type) {
          updatedInput = incomingInput;
        } else {
          updatedInput = { ...originalInput, ...incomingInput };
        }

        const expression = embeddableInputToExpression(updatedInput, type, undefined, true);

        dispatch(
          updateEmbeddableExpression({
            elementId: originalElement.id,
            embeddableExpression: expression,
          })
        );

        // update resolved args
        dispatch(fetchEmbeddableRenderable(originalElement.id));

        // select new embeddable element
        dispatch(selectToplevelNodes([embeddableId]));
      } else {
        const expression = embeddableInputToExpression(incomingInput, type, undefined, true);
        dispatch(addElement(selectedPage.id, { expression }));
      }
    }
  }, [dispatch, notifyService, selectedPage, incomingEmbeddable, isByValueEnabled]);
};
