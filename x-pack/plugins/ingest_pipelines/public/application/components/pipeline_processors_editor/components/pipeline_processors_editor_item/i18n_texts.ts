/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

export const i18nTexts = {
  moveButtonLabel: i18n.translate('xpack.ingestPipelines.pipelineEditor.item.moveButtonLabel', {
    defaultMessage: 'Move this processor',
  }),
  editButtonLabel: i18n.translate('xpack.ingestPipelines.pipelineEditor.item.editButtonAriaLabel', {
    defaultMessage: 'Edit this processor',
  }),
  duplicateButtonLabel: i18n.translate(
    'xpack.ingestPipelines.pipelineEditor.item.moreMenu.duplicateButtonLabel',
    {
      defaultMessage: 'Duplicate this processor',
    }
  ),
  addOnFailureButtonLabel: i18n.translate(
    'xpack.ingestPipelines.pipelineEditor.item.moreMenu.addOnFailureHandlerButtonLabel',
    {
      defaultMessage: 'Add on failure handler',
    }
  ),
  cancelMoveButtonLabel: i18n.translate(
    'xpack.ingestPipelines.pipelineEditor.item.cancelMoveButtonAriaLabel',
    {
      defaultMessage: 'Cancel move',
    }
  ),
  deleteButtonLabel: i18n.translate(
    'xpack.ingestPipelines.pipelineEditor.item.moreMenu.deleteButtonLabel',
    {
      defaultMessage: 'Delete',
    }
  ),
  moreButtonAriaLabel: i18n.translate(
    'xpack.ingestPipelines.pipelineEditor.item.moreButtonAriaLabel',
    {
      defaultMessage: 'Show more actions for this processor',
    }
  ),
  processorTypeLabel: ({ type }: { type: string }) =>
    i18n.translate('xpack.ingestPipelines.pipelineEditor.item.textInputAriaLabel', {
      defaultMessage: 'Provide a description for this {type} processor',
      values: { type },
    }),
  descriptionPlaceholder: i18n.translate(
    'xpack.ingestPipelines.pipelineEditor.item.descriptionPlaceholder',
    { defaultMessage: 'No description' }
  ),
};
