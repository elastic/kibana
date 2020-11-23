/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import classNames from 'classnames';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiBadge,
  EuiButtonIcon,
  EuiToolTip,
  // EuiIcon,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { NormalizedRuntimeField } from '../../types';
// import { getTypeLabelFromField } from '../../lib';

// import { CreateField } from './create_field';
// import { DeleteFieldProvider } from './delete_field_provider';

interface Props {
  field: NormalizedRuntimeField;
  // allFields: NormalizedFields['byId'];
  // isCreateFieldFormVisible: boolean;
  areActionButtonsVisible: boolean;
  isHighlighted: boolean;
  isDimmed: boolean;
  // isLastItem: boolean;
  editField(): void;
}

function RuntimeFieldsListItemComponent(
  {
    field,
    areActionButtonsVisible,
    isHighlighted,
    isDimmed,
    editField,
  }: // allFields,
  //
  //
  // isCreateFieldFormVisible,
  //
  // isLastItem,
  // childFieldsArray,
  // maxNestedDepth,

  // toggleExpand,
  // treeDepth,
  Props,
  ref: React.Ref<HTMLLIElement>
) {
  const {
    source,
    // id,
    // isMultiField,
    // canHaveChildFields,
    // hasChildFields,
    // canHaveMultiFields,
    // hasMultiFields,
    // isExpanded,
    // path,
  } = field;

  // const renderCreateField = () => {
  //   if (!isCreateFieldFormVisible) {
  //     return null;
  //   }

  //   return (
  //     <CreateField
  //       allFields={allFields}
  //       isRootLevelField={false}
  //       isMultiField={canHaveMultiFields}
  //       paddingLeft={indentCreateField}
  //       maxNestedDepth={maxNestedDepth}
  //     />
  //   );
  // };

  const renderActionButtons = () => {
    if (!areActionButtonsVisible) {
      return null;
    }

    const editButtonLabel = i18n.translate(
      'xpack.idxMgmt.mappingsEditor.editRuntimeFieldButtonLabel',
      {
        defaultMessage: 'Edit',
      }
    );

    // const deleteButtonLabel = i18n.translate(
    //   'xpack.idxMgmt.mappingsEditor.removeRuntimeFieldButtonLabel',
    //   {
    //     defaultMessage: 'Remove',
    //   }
    // );

    return (
      <EuiFlexGroup gutterSize="s" className="mappingsEditor__fieldsListItem__actions">
        {/* {canHaveMultiFields && (
          <EuiFlexItem grow={false}>
            <EuiToolTip content={addMultiFieldButtonLabel}>
              <EuiButtonIcon
                iconType="documents"
                onClick={addField}
                data-test-subj="addMultiFieldButton"
                aria-label={addMultiFieldButtonLabel}
              />
            </EuiToolTip>
          </EuiFlexItem>
        )} */}

        {/* {canHaveChildFields && (
          <EuiFlexItem grow={false}>
            <EuiToolTip content={addPropertyButtonLabel}>
              <EuiButtonIcon
                iconType="plusInCircle"
                onClick={addField}
                data-test-subj="addPropertyButton"
                aria-label={addPropertyButtonLabel}
              />
            </EuiToolTip>
          </EuiFlexItem>
        )} */}

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
          {/* <DeleteFieldProvider>
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
          </DeleteFieldProvider> */}
          delete
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  };

  // const dataTestSubj = `${path.join('')}Field`;
  const dataTestSubj = 'doWeNeedThis';

  return (
    <li
      className="mappingsEditor__fieldsListItem"
      data-test-subj={`runtimeFieldsListItem ${dataTestSubj}`}
    >
      <div
        className={classNames('mappingsEditor__fieldsListItem__field', {
          // eslint-disable-next-line @typescript-eslint/naming-convention
          'mappingsEditor__fieldsListItem__field--enabled': areActionButtonsVisible,
          // eslint-disable-next-line @typescript-eslint/naming-convention
          'mappingsEditor__fieldsListItem__field--highlighted': isHighlighted,
          // eslint-disable-next-line @typescript-eslint/naming-convention
          'mappingsEditor__fieldsListItem__field--dim': isDimmed,
        })}
      >
        <div className="mappingsEditor__fieldsListItem__wrapper mappingsEditor__fieldsListItem__wrapper--indent">
          <EuiFlexGroup
            gutterSize="s"
            alignItems="center"
            className="mappingsEditor__fieldsListItem__content"
          >
            {/* {isMultiField && (
              <EuiFlexItem grow={false} className="mappingsEditor__fieldsListItem__icon">
                <EuiIcon color="subdued" type="documents" />
              </EuiFlexItem>
            )} */}

            <EuiFlexItem
              grow={false}
              className="mappingsEditor__fieldsListItem__name"
              data-test-subj={`fieldName ${dataTestSubj}-fieldName`}
            >
              {source.name}
            </EuiFlexItem>

            <EuiFlexItem grow={false}>
              <EuiBadge
                color="hollow"
                data-test-subj={`fieldType ${dataTestSubj}-datatype`}
                data-type-value={source.type}
              >
                {/* {getTypeLabelFromField(source)} */}
                {source.type}
              </EuiBadge>
            </EuiFlexItem>

            <EuiFlexItem grow={false}>{renderActionButtons()}</EuiFlexItem>
          </EuiFlexGroup>
        </div>
      </div>

      {/* {renderCreateField()} */}
    </li>
  );
}

export const RuntimeFieldsListItem = React.memo(
  RuntimeFieldsListItemComponent
) as typeof RuntimeFieldsListItemComponent;
