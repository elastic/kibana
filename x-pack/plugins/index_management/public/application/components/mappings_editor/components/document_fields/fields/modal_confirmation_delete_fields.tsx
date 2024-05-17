/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBadge, EuiCode, EuiConfirmModal } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';

import { TYPE_DEFINITION } from '../../../constants';
import { buildFieldTreeFromIds } from '../../../lib';
import { NormalizedField, NormalizedFields } from '../../../types';
import { FieldsTree } from '../../fields_tree';

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
  );
};
