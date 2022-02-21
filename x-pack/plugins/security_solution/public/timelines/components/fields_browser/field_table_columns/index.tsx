/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
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
import type { BrowserFieldItem, FieldTableColumns } from '../../../../../../timelines/common/types';

import * as i18n from './translations';
import {
  getExampleText,
  getIconFromType,
} from '../../../../common/components/event_details/helpers';
import { getEmptyValue } from '../../../../common/components/empty_value';
import { EllipsisText } from '../../../../common/components/truncatable_text';

const TypeIcon = styled(EuiIcon)`
  margin: 0 4px;
  position: relative;
  top: -1px;
`;
TypeIcon.displayName = 'TypeIcon';

export const Description = styled.span`
  user-select: text;
  width: 350px;
`;
Description.displayName = 'Description';

export const FieldName = React.memo<{
  fieldId: string;
  highlight?: string;
}>(({ fieldId, highlight = '' }) => (
  <EuiText size="xs">
    <EuiHighlight data-test-subj={`field-name-${fieldId}`} search={highlight}>
      {fieldId}
    </EuiHighlight>
  </EuiText>
));
FieldName.displayName = 'FieldName';

export const getFieldTableColumns = (highlight: string): FieldTableColumns => [
  {
    field: 'name',
    name: i18n.NAME,
    dataType: 'string',
    render: (name: string, item: BrowserFieldItem) => {
      return (
        <EuiFlexGroup alignItems="center" gutterSize="none">
          <EuiFlexItem grow={false}>
            <EuiToolTip content={item.type}>
              <TypeIcon
                data-test-subj={`field-${name}-icon`}
                type={getIconFromType(item.type ?? null)}
              />
            </EuiToolTip>
          </EuiFlexItem>

          <EuiFlexItem grow={false}>
            <FieldName data-test-subj="field-name" fieldId={name} highlight={highlight} />
          </EuiFlexItem>
        </EuiFlexGroup>
      );
    },
    sortable: true,
    width: '200px',
  },
  {
    field: 'description',
    name: i18n.DESCRIPTION,
    render: (description, item) => (
      <EuiToolTip content={description}>
        <>
          <EuiScreenReaderOnly data-test-subj="descriptionForScreenReaderOnly">
            <p>{i18n.DESCRIPTION_FOR_FIELD(item.name ?? '')}</p>
          </EuiScreenReaderOnly>
          <EllipsisText>
            <Description data-test-subj={`field-${item.name}-description`}>
              {`${description ?? getEmptyValue()} ${getExampleText(item.example)}`}
            </Description>
          </EllipsisText>
        </>
      </EuiToolTip>
    ),
    sortable: true,
    width: '350px',
  },
  {
    field: 'isRuntime',
    name: i18n.RUNTIME,
    dataType: 'boolean',
    render: (isRuntime: boolean) =>
      isRuntime ? <EuiHealth color="success" title={i18n.RUNTIME_FIELD} /> : null,
    sortable: true,
    width: '80px',
  },
  {
    field: 'category',
    name: i18n.CATEGORY,
    dataType: 'string',
    render: (category: string) => <EuiBadge>{category}</EuiBadge>,
    sortable: true,
    width: '100px',
  },
];
