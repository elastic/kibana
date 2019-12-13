/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { toMountPoint } from '../../../../../src/plugins/kibana_react/public';
import {
  IAction,
  createAction,
  IncompatibleActionError,
} from '../../../../../src/plugins/ui_actions/public';
import { IEmbeddable } from '../../../../../src/plugins/embeddable/public';
import { EditExpressionModal } from './edit_expression_embeddable_modal';
import { EXPRESSION_EMBEDDABLE } from '../embeddable';

export const EDIT_EXPRESSION_EMBEDDABLE = 'EDIT_EXPRESSION_EMBEDDABLE';

interface ActionContext {
  embeddable: IEmbeddable;
}

async function isCompatible(context: ActionContext) {
  if (context.embeddable === undefined) {
    return false;
  }
  return context.embeddable.type === EXPRESSION_EMBEDDABLE;
}

export function createEditExpressionEmbeddableAction(openModal: any): IAction<ActionContext> {
  return createAction<ActionContext>({
    type: EDIT_EXPRESSION_EMBEDDABLE,
    id: EDIT_EXPRESSION_EMBEDDABLE,
    getDisplayName: () => {
      return i18n.translate('embeddableApi.actions.applyFilterActionTitle', {
        defaultMessage: 'Edit expression',
      });
    },
    isCompatible,
    execute: async ({ embeddable }: ActionContext) => {
      if (!(await isCompatible({ embeddable }))) {
        throw new IncompatibleActionError();
      }

      const modalSession = openModal(
        toMountPoint(
          <EditExpressionModal onClose={() => modalSession.close()} embeddable={embeddable} />
        )
      );
    },
  });
}
