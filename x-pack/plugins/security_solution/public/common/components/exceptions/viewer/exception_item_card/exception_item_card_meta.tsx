/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { EuiAvatar, EuiBadge, EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import { ExceptionListItemSchema } from '@kbn/securitysolution-io-ts-list-types';
import styled from 'styled-components';

import * as i18n from './translations';
import { FormattedDate, FormattedRelativePreferenceDate } from '../../../formatted_date';

const StyledCondition = styled('div')`
  padding-top: 4px !important;
`;
export interface ExceptionItemCardMetaInfoProps {
  item: ExceptionListItemSchema;
  dataTestSubj: string;
}

export const ExceptionItemCardMetaInfo = memo<ExceptionItemCardMetaInfoProps>(
  ({ item, dataTestSubj }) => {
    return (
      <EuiFlexGroup
        alignItems="center"
        responsive={false}
        gutterSize="s"
        data-test-subj={dataTestSubj}
      >
        <EuiFlexItem grow={false}>
          <MetaInfoDetails
            fieldName="created_by"
            label={i18n.EXCEPTION_ITEM_CREATED_LABEL}
            value1={<FormattedDate fieldName="created_by" value={item.created_at} />}
            value2={item.created_by}
            dataTestSubj={`${dataTestSubj}-createdBy`}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <MetaInfoDetails
            fieldName="updated_by"
            label={i18n.EXCEPTION_ITEM_UPDATED_LABEL}
            value1={
              <StyledCondition>
                <FormattedRelativePreferenceDate
                  value={item.updated_at}
                  tooltipFieldName="updated_by"
                  tooltipAnchorClassName="eui-textTruncate"
                />
              </StyledCondition>
            }
            value2={item.updated_by}
            dataTestSubj={`${dataTestSubj}-updatedBy`}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }
);
ExceptionItemCardMetaInfo.displayName = 'ExceptionItemCardMetaInfo';

interface MetaInfoDetailsProps {
  fieldName: string;
  label: string;
  value1: JSX.Element | string;
  value2: string;
  dataTestSubj: string;
}

const MetaInfoDetails = memo<MetaInfoDetailsProps>(({ label, value1, value2, dataTestSubj }) => {
  return (
    <EuiFlexGroup alignItems="center" gutterSize="s" wrap={false} responsive={false}>
      <EuiFlexItem grow={false}>
        <EuiBadge color="default" style={{ fontFamily: 'Inter' }}>
          {label}
        </EuiBadge>
      </EuiFlexItem>
      <EuiFlexItem grow={false} data-test-subj={`${dataTestSubj}-value1`}>
        <EuiText size="xs" style={{ fontFamily: 'Inter' }}>
          {value1}
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiText size="xs" style={{ fontStyle: 'italic', fontFamily: 'Inter' }}>
          {i18n.EXCEPTION_ITEM_META_BY}
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiFlexGroup responsive={false} gutterSize="xs" alignItems="center" wrap={false}>
          <EuiFlexItem grow={false}>
            <EuiAvatar initialsLength={2} name={value2.toUpperCase()} size="s" />
          </EuiFlexItem>
          <EuiFlexItem grow={false} className="eui-textTruncate">
            <EuiText
              size="xs"
              style={{ fontFamily: 'Inter' }}
              data-test-subj={`${dataTestSubj}-value2`}
            >
              {value2}
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
});

MetaInfoDetails.displayName = 'MetaInfoDetails';
