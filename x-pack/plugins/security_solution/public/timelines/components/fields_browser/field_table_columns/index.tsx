/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import styled from 'styled-components';
import {
  EuiToolTip,
  EuiFlexGroup,
  EuiFlexItem,
  EuiScreenReaderOnly,
  EuiHealth,
  EuiBadge,
  EuiIcon,
  EuiText,
  EuiHighlight,
} from '@elastic/eui';
import { Action } from '@elastic/eui/src/components/basic_table/action_types';
import type { BrowserFieldItem, GetFieldTableColumns } from '@kbn/timelines-plugin/common/types';

import * as i18n from './translations';
import {
  getExampleText,
  getIconFromType,
} from '../../../../common/components/event_details/helpers';
import { getEmptyValue } from '../../../../common/components/empty_value';
import { EllipsisText } from '../../../../common/components/truncatable_text';
import { OpenFieldEditor, OpenDeleteFieldModal } from '..';

export interface UseFieldTableColumnsProps {
  hasFieldEditPermission: boolean;
  openFieldEditor: OpenFieldEditor;
  openDeleteFieldModal: OpenDeleteFieldModal;
}

export type UseFieldTableColumns = (props: UseFieldTableColumnsProps) => GetFieldTableColumns;

const TypeIcon = styled(EuiIcon)`
  margin: 0 4px;
  position: relative;
  top: -1px;
`;
TypeIcon.displayName = 'TypeIcon';

export const Description = styled.span<{ width: string }>`
  user-select: text;
  width: ${({ width }) => width};
`;
Description.displayName = 'Description';

export const FieldName = React.memo<{
  fieldId: string;
  highlight?: string;
}>(({ fieldId, highlight = '' }) => (
  <EuiText size="xs">
    <EuiHighlight data-test-subj={`field-${fieldId}-name`} search={highlight}>
      {fieldId}
    </EuiHighlight>
  </EuiText>
));
FieldName.displayName = 'FieldName';

export const useFieldTableColumns: UseFieldTableColumns = ({
  hasFieldEditPermission,
  openFieldEditor,
  openDeleteFieldModal,
}) => {
  const getFieldTableColumns = useCallback<GetFieldTableColumns>(
    ({ highlight, onHide }) => {
      const actions: Array<Action<BrowserFieldItem>> = hasFieldEditPermission
        ? [
            {
              name: i18n.EDIT,
              description: i18n.EDIT_DESCRIPTION,
              type: 'icon',
              icon: 'pencil',
              isPrimary: true,
              onClick: ({ name }: BrowserFieldItem) => {
                openFieldEditor(name);
                onHide();
              },
              available: ({ isRuntime }) => isRuntime,
              'data-test-subj': 'actionEditRuntimeField',
            },
            {
              name: i18n.REMOVE,
              description: i18n.REMOVE_DESCRIPTION,
              type: 'icon',
              icon: 'trash',
              color: 'danger',
              isPrimary: true,
              onClick: ({ name }: BrowserFieldItem) => {
                openDeleteFieldModal(name);
                onHide();
              },
              available: ({ isRuntime }) => isRuntime,
              'data-test-subj': 'actionDeleteRuntimeField',
            },
          ]
        : [];

      return [
        {
          field: 'name',
          name: i18n.NAME,
          render: (name: string, { type }) => {
            return (
              <EuiFlexGroup alignItems="center" gutterSize="none">
                <EuiFlexItem grow={false}>
                  <EuiToolTip content={type}>
                    <TypeIcon
                      data-test-subj={`field-${name}-icon`}
                      type={getIconFromType(type ?? null)}
                    />
                  </EuiToolTip>
                </EuiFlexItem>

                <EuiFlexItem grow={false}>
                  <FieldName fieldId={name} highlight={highlight} />
                </EuiFlexItem>
              </EuiFlexGroup>
            );
          },
          sortable: true,
          width: '225px',
        },
        {
          field: 'description',
          name: i18n.DESCRIPTION,
          render: (description, { name, example }) => (
            <EuiToolTip content={description}>
              <>
                <EuiScreenReaderOnly data-test-subj="descriptionForScreenReaderOnly">
                  <p>{i18n.DESCRIPTION_FOR_FIELD(name)}</p>
                </EuiScreenReaderOnly>
                <EllipsisText>
                  <Description
                    width={actions.length > 0 ? '335px' : '400px'}
                    data-test-subj={`field-${name}-description`}
                  >
                    {`${description ?? getEmptyValue()} ${getExampleText(example)}`}
                  </Description>
                </EllipsisText>
              </>
            </EuiToolTip>
          ),
          sortable: true,
          width: actions.length > 0 ? '335px' : '400px',
        },
        {
          field: 'isRuntime',
          name: i18n.RUNTIME,
          render: (isRuntime: boolean) =>
            isRuntime ? <EuiHealth color="success" title={i18n.RUNTIME_FIELD} /> : null,
          sortable: true,
          width: '80px',
        },
        {
          field: 'category',
          name: i18n.CATEGORY,
          render: (category: string, { name }) => (
            <EuiBadge data-test-subj={`field-${name}-category`}>{category}</EuiBadge>
          ),
          sortable: true,
          width: '115px',
        },
        ...(actions.length > 0
          ? [
              {
                name: i18n.ACTIONS,
                actions,
                width: '80px',
              },
            ]
          : []),
      ];
    },
    [hasFieldEditPermission, openFieldEditor, openDeleteFieldModal]
  );

  return getFieldTableColumns;
};
