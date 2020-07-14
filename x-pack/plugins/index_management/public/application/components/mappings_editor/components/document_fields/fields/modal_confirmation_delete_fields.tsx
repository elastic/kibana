/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { EuiConfirmModal, EuiOverlayMask, EuiBadge, EuiCode } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { NormalizedFields, NormalizedField } from '../../../types';
import { buildFieldTreeFromIds } from '../../../lib';
import { FieldsTree } from '../../fields_tree';
import { TYPE_DEFINITION } from '../../../constants';

interface Props {
  title: string;
  confirmButtonText: string;
  childFields?: string[];
  aliases?: string[];
  byId: NormalizedFields['byId'];
  onCancel(): void;
  onConfirm(): void;
}

export const ModalConfirmationDeleteFields = ({
  title,
  childFields,
  aliases,
  byId,
  confirmButtonText,
  onCancel,
  onConfirm,
}: Props) => {
  const fieldsTree =
    childFields && childFields.length
      ? buildFieldTreeFromIds(childFields, byId, (fieldItem: NormalizedField) => (
          <>
            {fieldItem.source.name}
            {fieldItem.isMultiField && (
              <>
                {' '}
                <EuiBadge color="hollow">
                  {i18n.translate(
                    'xpack.idxMgmt.mappingsEditor.deleteField.confirmationModal.multiFieldBadgeLabel',
                    {
                      defaultMessage: '{dataType} multi-field',
                      values: {
                        dataType: TYPE_DEFINITION[fieldItem.source.type].label,
                      },
                    }
                  )}
                </EuiBadge>
              </>
            )}
          </>
        ))
      : null;

  return (
    <EuiOverlayMask>
      <EuiConfirmModal
        title={title}
        onCancel={onCancel}
        onConfirm={onConfirm}
        cancelButtonText={i18n.translate(
          'xpack.idxMgmt.mappingsEditor.deleteField.confirmationModal.cancelButtonLabel',
          {
            defaultMessage: 'Cancel',
          }
        )}
        buttonColor="danger"
        confirmButtonText={confirmButtonText}
      >
        <>
          {fieldsTree && (
            <>
              <p>
                {i18n.translate(
                  'xpack.idxMgmt.mappingsEditor.confirmationModal.deleteFieldsDescription',
                  {
                    defaultMessage: 'This will also delete the following fields.',
                  }
                )}
              </p>
              <FieldsTree fields={fieldsTree} />
            </>
          )}
          {aliases && (
            <>
              <p>
                {i18n.translate(
                  'xpack.idxMgmt.mappingsEditor.confirmationModal.deleteAliasesDescription',
                  {
                    defaultMessage: 'The following aliases will also be deleted.',
                  }
                )}
              </p>
              <ul>
                {aliases.map((aliasPath) => (
                  <li key={aliasPath}>
                    <EuiCode>{aliasPath}</EuiCode>
                  </li>
                ))}
              </ul>
            </>
          )}
        </>
      </EuiConfirmModal>
    </EuiOverlayMask>
  );
};
