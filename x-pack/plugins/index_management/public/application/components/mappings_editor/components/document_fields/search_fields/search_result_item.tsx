/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import classNames from 'classnames';
import { EuiFlexGroup, EuiFlexItem, EuiButtonIcon, EuiBadge, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { SearchResult } from '../../../types';
import { TYPE_DEFINITION } from '../../../constants';
import { useDispatch } from '../../../mappings_state';
import { getTypeLabelFromType } from '../../../lib';
import { DeleteFieldProvider } from '../fields/delete_field_provider';

interface Props {
  item: SearchResult;
  areActionButtonsVisible: boolean;
  isHighlighted: boolean;
  isDimmed: boolean;
}

export const SearchResultItem = React.memo(function FieldListItemFlatComponent({
  item: { display, field },
  areActionButtonsVisible,
  isHighlighted,
  isDimmed,
}: Props) {
  const dispatch = useDispatch();
  const { source, isMultiField, hasChildFields, hasMultiFields } = field;

  const editField = () => {
    dispatch({
      type: 'documentField.editField',
      value: field.id,
    });
  };

  const renderActionButtons = () => {
    if (!areActionButtonsVisible) {
      return null;
    }

    const editButtonLabel = i18n.translate('xpack.idxMgmt.mappingsEditor.editFieldButtonLabel', {
      defaultMessage: 'Edit',
    });

    const deleteButtonLabel = i18n.translate(
      'xpack.idxMgmt.mappingsEditor.removeFieldButtonLabel',
      {
        defaultMessage: 'Remove',
      }
    );

    return (
      <EuiFlexGroup gutterSize="s" className="mappingsEditor__fieldsListItem__actions">
        <EuiFlexItem grow={false}>
          <EuiToolTip content={editButtonLabel}>
            <EuiButtonIcon
              iconType="pencil"
              onClick={editField}
              data-test-subj="editFieldButton"
              aria-label={editButtonLabel}
            />
          </EuiToolTip>
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          <DeleteFieldProvider>
            {(deleteField) => (
              <EuiToolTip content={deleteButtonLabel}>
                <EuiButtonIcon
                  iconType="trash"
                  color="danger"
                  onClick={() => deleteField(field)}
                  data-test-subj="removeFieldButton"
                  aria-label={deleteButtonLabel}
                />
              </EuiToolTip>
            )}
          </DeleteFieldProvider>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  };

  return (
    <div className={classNames('mappingsEditor__fieldsListItem')} data-test-subj="fieldsListItem">
      <div
        className={classNames('mappingsEditor__fieldsListItem__field', {
          'mappingsEditor__fieldsListItem__field--enabled': areActionButtonsVisible,
          'mappingsEditor__fieldsListItem__field--selected': isHighlighted,
          'mappingsEditor__fieldsListItem__field--dim': isDimmed,
        })}
      >
        <div className={classNames('mappingsEditor__fieldsListItem__wrapper')}>
          <EuiFlexGroup
            gutterSize="s"
            alignItems="center"
            className={classNames('mappingsEditor__fieldsListItem__content', {
              'mappingsEditor__fieldsListItem__content--toggle': hasChildFields || hasMultiFields,
              'mappingsEditor__fieldsListItem__content--multiField': isMultiField,
            })}
          >
            <EuiFlexItem grow={false} className="mappingsEditor__fieldsListItem__name">
              {display}
            </EuiFlexItem>

            <EuiFlexItem grow={false}>
              <EuiBadge color="hollow">
                {isMultiField
                  ? i18n.translate('xpack.idxMgmt.mappingsEditor.multiFieldBadgeLabel', {
                      defaultMessage: '{dataType} multi-field',
                      values: {
                        dataType: TYPE_DEFINITION[source.type].label,
                      },
                    })
                  : getTypeLabelFromType(source.type)}
              </EuiBadge>
            </EuiFlexItem>

            <EuiFlexItem>{renderActionButtons()}</EuiFlexItem>
          </EuiFlexGroup>
        </div>
      </div>
    </div>
  );
});
