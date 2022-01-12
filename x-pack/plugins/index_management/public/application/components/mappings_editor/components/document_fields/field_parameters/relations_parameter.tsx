/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiButtonEmpty,
  EuiToolTip,
  EuiButtonIcon,
  EuiSpacer,
  EuiCallOut,
  EuiLink,
  EuiBasicTable,
  EuiBasicTableColumn,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import {
  UseField,
  UseArray,
  ArrayItem,
  FieldConfig,
  TextField,
  ComboBoxField,
} from '../../../shared_imports';
import { Field } from '../../../types';

import { documentationService } from '../../../../../services/documentation';
import { EditFieldFormRow } from '../fields/edit_field';

// This is the Elasticsearch interface to declare relations
interface RelationsES {
  [parent: string]: string | string[];
}

// Internally we will use this type for "relations" as it is more UI friendly
// to loop over the relations and its children
type RelationsInternal = Array<{ parent: string; children: string[] }>;

/**
 * Export custom serializer to be used when we need to serialize the form data to be sent to ES
 * @param field The field to be serialized
 */
export const relationsSerializer = (field: Field): Field => {
  if (field.relations === undefined) {
    return field;
  }

  const relations = field.relations as RelationsInternal;
  const relationsSerialized = relations.reduce(
    (acc, item) => ({
      ...acc,
      [item.parent]: item.children.length === 1 ? item.children[0] : item.children,
    }),
    {} as RelationsES
  );

  return {
    ...field,
    relations: relationsSerialized,
  };
};

/**
 * Export custom deserializer to be used when we need to deserialize the data coming from ES
 * @param field The field to be serialized
 */
export const relationsDeserializer = (field: Field): Field => {
  if (field.relations === undefined) {
    return field;
  }

  const relations = field.relations as RelationsES;
  const relationsDeserialized = Object.entries(relations).map(([parent, children]) => ({
    parent,
    children: typeof children === 'string' ? [children] : children,
  }));

  return {
    ...field,
    relations: relationsDeserialized,
  };
};

const childConfig: FieldConfig = {
  defaultValue: [],
};

export const RelationsParameter = () => {
  const renderWarning = () => (
    <EuiCallOut
      color="warning"
      iconType="alert"
      size="s"
      title={
        <FormattedMessage
          id="xpack.idxMgmt.mappingsEditor.join.multiLevelsParentJoinWarningTitle"
          defaultMessage="Avoid using multiple levels to replicate a relational model. Each relation level increases computation time and memory consumption at query time. For best performance, {docsLink}"
          values={{
            docsLink: (
              <EuiLink
                href={documentationService.getJoinMultiLevelsPerformanceLink()}
                target="_blank"
              >
                {i18n.translate(
                  'xpack.idxMgmt.mappingsEditor.join.multiLevelsPerformanceDocumentationLink',
                  {
                    defaultMessage: 'denormalize your data.',
                  }
                )}
              </EuiLink>
            ),
          }}
        />
      }
    />
  );

  return (
    <EditFieldFormRow
      title={i18n.translate('xpack.idxMgmt.mappingsEditor.relationshipsTitle', {
        defaultMessage: 'Relationships',
      })}
      withToggle={false}
    >
      <UseArray path="relations" initialNumberOfItems={0}>
        {({ items, addItem, removeItem }) => {
          const columns: Array<EuiBasicTableColumn<any>> = [
            // Parent column
            {
              name: i18n.translate(
                'xpack.idxMgmt.mappingsEditor.joinType.relationshipTable.parentColumnTitle',
                {
                  defaultMessage: 'Parent',
                }
              ),
              render: (item: ArrayItem) => {
                // By adding ".parent" to the path, we are saying that we want an **object**
                // to be created for each array item.
                // This object will have a "parent" property with the field value.
                return (
                  <div style={{ width: '100%' }}>
                    <UseField
                      path={`${item.path}.parent`}
                      component={TextField}
                      componentProps={{
                        euiFieldProps: {
                          'aria-label': i18n.translate(
                            'xpack.idxMgmt.mappingsEditor.joinType.relationshipTable.parentFieldAriaLabel',
                            {
                              defaultMessage: 'Parent field',
                            }
                          ),
                        },
                      }}
                      // For a newly created relation, we don't want to read
                      // its default value provided to the form because... it is new! :)
                      readDefaultValueOnForm={!item.isNew}
                    />
                  </div>
                );
              },
            },
            // Children column (ComboBox)
            {
              name: i18n.translate(
                'xpack.idxMgmt.mappingsEditor.joinType.relationshipTable.childrenColumnTitle',
                {
                  defaultMessage: 'Children',
                }
              ),
              render: (item: ArrayItem) => {
                return (
                  <div style={{ width: '100%' }}>
                    <UseField
                      path={`${item.path}.children`}
                      config={childConfig}
                      component={ComboBoxField}
                      componentProps={{
                        euiFieldProps: {
                          'aria-label': i18n.translate(
                            'xpack.idxMgmt.mappingsEditor.joinType.relationshipTable.childrenFieldAriaLabel',
                            {
                              defaultMessage: 'Children field',
                            }
                          ),
                        },
                      }}
                      readDefaultValueOnForm={!item.isNew}
                    />
                  </div>
                );
              },
            },
            // Actions column
            {
              width: '48px',
              actions: [
                {
                  render: ({ id }: ArrayItem) => {
                    const label = i18n.translate(
                      'xpack.idxMgmt.mappingsEditor.joinType.relationshipTable.removeRelationshipTooltipLabel',
                      {
                        defaultMessage: 'Remove relationship',
                      }
                    );
                    return (
                      <EuiToolTip content={label} delay="long">
                        <EuiButtonIcon
                          data-test-subj="removeRelationshipButton"
                          aria-label={label}
                          iconType="minusInCircle"
                          color="danger"
                          onClick={() => removeItem(id)}
                        />
                      </EuiToolTip>
                    );
                  },
                },
              ],
            },
          ];

          return (
            <>
              {items.length > 1 && (
                <>
                  {renderWarning()}
                  <EuiSpacer />
                </>
              )}

              <EuiBasicTable
                items={items}
                itemId="id"
                columns={columns}
                noItemsMessage={i18n.translate(
                  'xpack.idxMgmt.mappingsEditor.joinType.relationshipTable.emptyTableMessage',
                  {
                    defaultMessage: 'No relationship defined',
                  }
                )}
                hasActions
              />

              {/* Add relation button */}
              <EuiButtonEmpty
                onClick={addItem}
                iconType="plusInCircleFilled"
                data-test-subj="addRelationButton"
              >
                {i18n.translate(
                  'xpack.idxMgmt.mappingsEditor.joinType.addRelationshipButtonLabel',
                  {
                    defaultMessage: 'Add relationship',
                  }
                )}
              </EuiButtonEmpty>
            </>
          );
        }}
      </UseArray>
    </EditFieldFormRow>
  );
};
